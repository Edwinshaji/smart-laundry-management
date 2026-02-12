from django.shortcuts import render
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from accounts.models import User
from locations.models import Branch, CustomerAddress, ServiceZone
from orders.models import Order
from .models import Payment, PaymentFine
from .services import ensure_fine_for_payment
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from branch_management.models import BranchManager
from subscriptions.models import CustomerSubscription
import razorpay
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.decorators import authentication_classes
from razorpay.errors import SignatureVerificationError
from datetime import date, timedelta
from django.db import transaction

# Razorpay client (lazy init to avoid import-time crashes)
_client = None
def _get_razorpay_client():
    global _client
    if _client is not None:
        return _client

    key_id = getattr(settings, "RAZORPAY_KEY_ID", None)
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", None)

    if not key_id or not key_secret:
        # do not leak secrets; only indicate presence
        raise RuntimeError(
            "Razorpay keys are not configured. "
            f"RAZORPAY_KEY_ID set? {bool(key_id)}; RAZORPAY_KEY_SECRET set? {bool(key_secret)}. "
            "Check backend/.env and that core/settings.py loads it via load_dotenv()."
        )

    _client = razorpay.Client(auth=(key_id, key_secret))
    return _client

class AdminOverviewView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        total_revenue = Payment.objects.filter(payment_status="paid").aggregate(
            total=Sum("amount")
        )["total"] or 0

        active_branches = Branch.objects.filter(is_active=True).count()
        users_total = User.objects.count()
        orders_total = Order.objects.count()

        perf_qs = (
            Order.objects.values("branch__branch_name")
            .annotate(total=Count("id"))
            .order_by("-total")[:10]
        )
        branch_performance = [p["total"] for p in perf_qs] or [60, 40, 80, 50, 70, 90, 55, 35, 75, 65]

        return Response(
            {
                "weeklyRevenue": float(total_revenue),
                "activeBranches": active_branches,
                "onlineUsers": users_total,
                "ordersTotal": orders_total,
                "branchPerformance": branch_performance,
                "traffic": {"search": 40, "direct": 30, "social": 30},
            },
            status=status.HTTP_200_OK,
        )

class AdminPaymentsView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        payments = Payment.objects.select_related("user").order_by("-due_date")[:200]
        data = [
            {
                "id": p.id,
                "user": p.user.full_name,
                "type": p.payment_type,
                "amount": float(p.amount) if p.amount is not None else None,
                "status": p.payment_status,
            }
            for p in payments
        ]
        return Response(data, status=status.HTTP_200_OK)

class AdminAnalyticsView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        now = timezone.now()
        monthly_revenue = Payment.objects.filter(
            payment_status="paid",
            payment_date__year=now.year,
            payment_date__month=now.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        return Response(
            {
                "totalOrders": Order.objects.count(),
                "monthlyRevenue": float(monthly_revenue),
                "activeBranches": Branch.objects.filter(is_active=True).count(),
                "usersTotal": User.objects.count(),
            },
            status=status.HTTP_200_OK,
        )

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

def _get_branch(request):
    if request.user and request.user.is_authenticated:
        try:
            return BranchManager.objects.select_related("branch").get(user=request.user).branch
        except BranchManager.DoesNotExist:
            pass
    branch_id = request.query_params.get("branch_id") or request.data.get("branch_id")
    if branch_id:
        try:
            return Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return None
    return None

class ManagerMonthlyPaymentsView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_branch_pincode_set(self, branch):
        pincodes = set()
        zones = ServiceZone.objects.filter(branch=branch).only("pincodes")
        for z in zones:
            raw = getattr(z, "pincodes", None) or []
            if isinstance(raw, str):
                # tolerate legacy/incorrect storage like "682001,682002"
                raw = [p.strip() for p in raw.replace(";", ",").split(",") if p.strip()]
            if isinstance(raw, (list, tuple)):
                for p in raw:
                    s = str(p).strip()
                    if s:
                        pincodes.add(s)
        return pincodes

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine customers for this branch using their latest address pincode,
        # matched against this branch's service-zone pincodes.
        # This avoids missing payments when monthly orders haven't been generated yet.
        branch_pincodes = self._get_branch_pincode_set(branch)
        if not branch_pincodes:
            return Response([], status=status.HTTP_200_OK)

        # Consider users who have (or had) subscriptions at any point; payments always link to subscription.
        sub_user_ids = list(CustomerSubscription.objects.values_list("user_id", flat=True).distinct())

        latest_addr_by_user = {}
        for addr in (
            CustomerAddress.objects.filter(user_id__in=sub_user_ids)
            .only("id", "user_id", "pincode")
            .order_by("user_id", "-id")
        ):
            if addr.user_id not in latest_addr_by_user:
                latest_addr_by_user[addr.user_id] = addr

        eligible_user_ids = [
            uid
            for uid, addr in latest_addr_by_user.items()
            if str(getattr(addr, "pincode", "")).strip() in branch_pincodes
        ]

        # Also include users that already have orders in this branch.
        # This covers cases where the customer's latest address changed, but their
        # subscription orders (and payments) still belong to this branch.
        order_user_ids = list(
            Order.objects.filter(branch=branch)
            .values_list("user_id", flat=True)
            .distinct()
        )

        eligible_user_ids = list(set(eligible_user_ids).union(set(order_user_ids)))

        payments = Payment.objects.select_related(
            "user", "subscription", "subscription__plan"
        ).filter(
            payment_type="monthly",
            subscription__isnull=False,
            subscription__user_id__in=eligible_user_ids,
        ).order_by("-due_date")[:200]

        # NEW: ensure fine rows exist for any overdue pending payments in this list
        try:
            today = timezone.localdate()
            for p in payments:
                ensure_fine_for_payment(p, today=today)
        except Exception:
            pass

        fines_qs = PaymentFine.objects.filter(payment__in=payments).order_by("payment_id", "-calculated_at")
        fine_map = {}
        for f in fines_qs:
            if f.payment_id not in fine_map:
                fine_map[f.payment_id] = {"fine_amount": float(f.fine_amount), "fine_days": f.fine_days}

        data = [
            {
                "id": p.id,
                "user": p.user.full_name,
                "plan": p.subscription.plan.name if p.subscription and p.subscription.plan else None,
                "amount": float(p.amount),
                "status": p.payment_status,
                "fine_amount": fine_map.get(p.id, {}).get("fine_amount"),
                "fine_days": fine_map.get(p.id, {}).get("fine_days"),
            }
            for p in payments
        ]
        return Response(data, status=status.HTTP_200_OK)

class CustomerPayNowView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        payment_id = request.data.get("payment_id")
        if not payment_id:
            return Response({"detail": "payment_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            p = Payment.objects.select_related("subscription", "subscription__plan", "order").get(
                id=payment_id,
                user=request.user,
                payment_status="pending",
            )
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found or already paid"}, status=status.HTTP_404_NOT_FOUND)

        if p.payment_type == "demand":
            if not p.order or p.order.status != "delivered":
                return Response({"detail": "Order is not delivered yet"}, status=status.HTTP_400_BAD_REQUEST)
            if p.amount in [None, 0]:
                return Response({"detail": "Amount not calculated yet"}, status=status.HTTP_400_BAD_REQUEST)

        p.payment_status = "paid"
        p.payment_date = date.today()
        p.save(update_fields=["payment_status", "payment_date"])

        # NEW: clear any fine row for this payment
        PaymentFine.objects.filter(payment=p).delete()

        if p.payment_type == "monthly" and p.subscription:
            _renew_subscription_after_payment(p.subscription, request.user, payment=p)

            # NEW: resume service by ensuring today's monthly order exists
            try:
                from django.utils import timezone
                from orders import views as order_views
                today_local = timezone.localdate()
                order_views._ensure_monthly_orders_for_subscription(p.subscription, today_local, today_local)
            except Exception:
                pass

        return Response({"detail": "Payment successful"}, status=status.HTTP_200_OK)

class CustomerPaymentsView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        payments = Payment.objects.select_related(
            "order", "subscription", "subscription__plan"
        ).filter(user=request.user).order_by("-id")[:200]

        # NEW: ensure fines for any overdue pending payments in this list
        try:
            for p in payments:
                ensure_fine_for_payment(p, today=today)
        except Exception:
            pass

        payment_ids = [p.id for p in payments]
        fines = PaymentFine.objects.filter(payment_id__in=payment_ids)
        fine_map = {f.payment_id: f for f in fines}

        order_ids = [p.order_id for p in payments if p.order_id]
        from orders.models import OrderWeight
        weights = OrderWeight.objects.filter(order_id__in=order_ids)
        weight_map = {w.order_id: w.weight_kg for w in weights}

        data = []
        for p in payments:
            fine = fine_map.get(p.id)
            weight = weight_map.get(p.order_id) if p.order_id else None

            order_status = p.order.status if getattr(p, "order", None) else None
            is_payable = (p.payment_type == "monthly") or (order_status == "delivered")

            # CHANGED: treat demand amount 0/NULL as not-calculated => send None to UI
            amt = p.amount
            if p.payment_type == "demand" and (amt is None or amt == 0):
                amt_out = None
            else:
                amt_out = float(amt) if amt is not None else None

            # NEW: hide demand due_date until delivered (avoid placeholder/far-future dates in UI)
            if p.payment_type == "demand" and order_status != "delivered":
                due_out = None
            else:
                due_out = p.due_date.isoformat() if p.due_date else None

            data.append({
                "id": p.id,
                "amount": amt_out,
                "payment_type": p.payment_type,
                "payment_status": p.payment_status,
                "payment_date": p.payment_date.isoformat() if p.payment_date else None,
                "due_date": due_out,  # CHANGED

                "fine_amount": float(fine.fine_amount) if fine else 0,
                "fine_days": fine.fine_days if fine else 0,

                "order_id": p.order_id,
                "order_status": order_status,
                "is_payable": is_payable,
                "weight_kg": float(weight) if weight else None,

                "subscription_id": p.subscription_id,
                "plan_name": p.subscription.plan.name if p.subscription and p.subscription.plan else None,
            })

        return Response(data, status=status.HTTP_200_OK)

@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])  # <-- key fix (avoid CSRF 403 on POST)
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    amount = request.data.get("amount")  # in rupees

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return Response({"detail": "amount must be a number (in rupees)"}, status=status.HTTP_400_BAD_REQUEST)

    if amount <= 0:
        return Response({"detail": "amount must be greater than 0"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        client = _get_razorpay_client()
        order = client.order.create(
            {
                "amount": int(round(amount * 100)),  # paise
                "currency": "INR",
                "payment_capture": 1,
            }
        )
    except RuntimeError as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception:
        return Response({"detail": "Failed to create Razorpay order"}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(
        {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": "INR",
            "key": settings.RAZORPAY_KEY_ID,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([CsrfExemptSessionAuthentication])  # <-- key fix (avoid CSRF 403 on POST)
@permission_classes([IsAuthenticated])
def verify_payment(request):
    data = request.data or {}

    required = ("razorpay_order_id", "razorpay_payment_id", "razorpay_signature")
    missing = [k for k in required if not data.get(k)]
    if missing:
        return Response({"detail": f"Missing fields: {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        client = _get_razorpay_client()
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": data["razorpay_order_id"],
                "razorpay_payment_id": data["razorpay_payment_id"],
                "razorpay_signature": data["razorpay_signature"],
            }
        )
        return Response({"status": "success"}, status=status.HTTP_200_OK)
    except SignatureVerificationError:
        return Response({"status": "failed"}, status=status.HTTP_400_BAD_REQUEST)
    except RuntimeError as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception:
        return Response({"detail": "Verification error"}, status=status.HTTP_502_BAD_GATEWAY)

def _renew_subscription_after_payment(sub, user, *, payment=None):
    """Extend subscription by 30 days.

    NOTE: Do NOT create the next monthly payment immediately after a successful payment.
    A new payment should be generated only when the current 30-day period completes
    (see management command generate_monthly_payments).
    """
    if not sub or not sub.is_active:
        return

    # If this is the first monthly payment created at subscription signup,
    # it covers the initial 30-day period and should NOT extend end_date.
    try:
        if payment and getattr(payment, "payment_type", None) == "monthly":
            first_monthly_payment_id = (
                Payment.objects.filter(subscription=sub, payment_type="monthly")
                .order_by("id")
                .values_list("id", flat=True)
                .first()
            )
            if first_monthly_payment_id == getattr(payment, "id", None):
                return
    except Exception:
        # Fail open: if we can't determine, keep existing behavior.
        pass

    # NEW: ensure we have plan loaded (avoid edge cases where sub.plan isn't available)
    if not hasattr(sub, "plan") or sub.plan is None:
        sub = CustomerSubscription.objects.select_related("plan").get(id=sub.id)

    today = date.today()

    # Do not extend early. Renewal should happen only when the period completed.
    if sub.end_date and today < sub.end_date:
        return

    # Extend from end_date (spec requirement). If end_date is missing, extend from today.
    base_end = sub.end_date or today
    new_end_date = base_end + timedelta(days=30)

    sub.end_date = new_end_date
    sub.save(update_fields=["end_date"])

    # Clear any pre-generated pending monthly payments created by older logic.
    # After paying, the next payment should appear only when due.
    Payment.objects.filter(
        subscription=sub,
        payment_type="monthly",
        payment_status="pending",
    ).delete()
