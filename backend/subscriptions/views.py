from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from branch_management.models import BranchManager
from locations.models import Branch
from orders.models import Order, OrderWeight, OrderStatusLog  # CHANGED: include OrderStatusLog
from .models import CustomerSubscription, SubscriptionPlan, SubscriptionSkipDay
from payments.models import Payment
from payments.services import ensure_fine_for_payment
from datetime import date, timedelta
from django.db.models import Sum
from django.db import transaction
from django.utils import timezone
from django.conf import settings  # NEW
from decimal import Decimal  # NEW

from locations.models import CustomerAddress, ServiceZone  # NEW/ensure present
from branch_management.models import DeliveryStaff         # NEW/ensure present
from orders.models import Order                            # ensure imported

MONTHLY_ORDER_GENERATE_DAYS_AHEAD = 3  # keep in sync with orders/views.py behavior

def _resolve_monthly_order_context_for_user(u):
    addr = CustomerAddress.objects.filter(user=u).order_by("-id").first()
    if not addr or not getattr(addr, "pincode", None):
        return None, None, None

    pincode = str(getattr(addr, "pincode", "")).strip()
    zone = ServiceZone.objects.select_related("branch").filter(
        pincodes__contains=[pincode],
        branch__is_active=True,
    ).first()
    branch = zone.branch if zone else None
    if not branch:
        return None, None, None

    staff = None
    if zone:
        qs = DeliveryStaff.objects.select_related("user").filter(
            zone=zone,
            user__is_active=True,
            user__is_approved=True,
        )
        staff = qs.filter(is_available=True).order_by("id").first() or qs.order_by("id").first()

    return branch, addr, staff

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

class ManagerSubscriptionsView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)

        user_ids = Order.objects.filter(
            branch=branch,
            order_type="monthly",
        ).values_list("user_id", flat=True).distinct()

        subs = CustomerSubscription.objects.select_related("user", "plan").filter(
            user_id__in=user_ids,
            is_active=True,
        )

        plans = SubscriptionPlan.objects.all().order_by("monthly_price")

        return Response(
            {
                "plans": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "monthly_price": float(p.monthly_price),
                        "max_weight_per_month": float(p.max_weight_per_month),
                        "description": p.description,
                    }
                    for p in plans
                ],
                "customers": [
                    {
                        "user_id": s.user.id,
                        "name": s.user.full_name,
                        "email": s.user.email,
                        "phone": s.user.phone,
                        "plan": s.plan.name,
                        "preferred_pickup_shift": s.preferred_pickup_shift,
                        "start_date": s.start_date.isoformat() if s.start_date else None,
                        "end_date": s.end_date.isoformat() if s.end_date else None,
                    }
                    for s in subs
                ],
            },
            status=status.HTTP_200_OK,
        )

class AdminPlansView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        plans = SubscriptionPlan.objects.all().order_by("monthly_price")
        data = [
            {
                "id": p.id,
                "name": p.name,
                "monthly_price": float(p.monthly_price),
                "max_weight_per_month": float(p.max_weight_per_month),
                "description": p.description,
            }
            for p in plans
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get("name")
        monthly_price = request.data.get("monthly_price")
        max_weight_per_month = request.data.get("max_weight_per_month")
        description = request.data.get("description", "")

        if not name or monthly_price in [None, ""] or max_weight_per_month in [None, ""]:
            return Response({"detail": "name, monthly_price, max_weight_per_month required"}, status=status.HTTP_400_BAD_REQUEST)

        plan = SubscriptionPlan.objects.create(
            name=name,
            monthly_price=monthly_price,
            max_weight_per_month=max_weight_per_month,
            description=description,
        )
        return Response({"id": plan.id}, status=status.HTTP_201_CREATED)

class AdminPlanDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk=None):
        try:
            plan = SubscriptionPlan.objects.get(id=pk)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        plan.name = request.data.get("name", plan.name)
        if "monthly_price" in request.data:
            plan.monthly_price = request.data.get("monthly_price")
        if "max_weight_per_month" in request.data:
            plan.max_weight_per_month = request.data.get("max_weight_per_month")
        if "description" in request.data:
            plan.description = request.data.get("description")

        plan.save()
        return Response({"detail": "Updated"}, status=status.HTTP_200_OK)

    def delete(self, request, pk=None):
        try:
            plan = SubscriptionPlan.objects.get(id=pk)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CustomerPlansListView(APIView):
    """List all available subscription plans for customers."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        plans = SubscriptionPlan.objects.all().order_by("monthly_price")
        data = [
            {
                "id": p.id,
                "name": p.name,
                "monthly_price": float(p.monthly_price),
                "max_weight_per_month": float(p.max_weight_per_month),
                "description": p.description,
            }
            for p in plans
        ]
        return Response(data, status=status.HTTP_200_OK)


class CustomerSubscribeView(APIView):
    """Allow customer to subscribe to a plan (creates CustomerSubscription row)."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        plan_id = request.data.get("plan_id")
        preferred_pickup_shift = request.data.get("preferred_pickup_shift")

        if not plan_id or not preferred_pickup_shift:
            return Response(
                {"detail": "plan_id and preferred_pickup_shift are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if preferred_pickup_shift not in ["morning", "evening"]:
            return Response(
                {"detail": "preferred_pickup_shift must be 'morning' or 'evening'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent duplicate active subscriptions
        if CustomerSubscription.objects.select_for_update().filter(user=request.user, is_active=True).exists():
            return Response(
                {"detail": "You already have an active subscription"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = SubscriptionPlan.objects.get(id=int(plan_id))
        except (SubscriptionPlan.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

        today = date.today()
        # Subscription valid for 30 days from today
        end_date = today + timedelta(days=30)

        subscription = CustomerSubscription.objects.create(
            user=request.user,
            plan=plan,
            preferred_pickup_shift=preferred_pickup_shift,
            is_active=True,
            start_date=today,
            end_date=end_date,
        )

        # Create first month's payment at signup (4-day grace period)
        due_date = today + timedelta(days=4)
        payment = Payment.objects.create(
            user=request.user,
            subscription=subscription,
            order=None,
            amount=plan.monthly_price,
            payment_type="monthly",
            payment_status="pending",
            due_date=due_date,
        )

        # CHANGED: generate only TODAY's subscription order immediately (avoid tomorrow)
        try:
            from orders import views as order_views
            start = timezone.localdate()
            end = start
            order_views._ensure_monthly_orders_for_subscription(subscription, start, end)
        except Exception:
            pass

        return Response(
            {
                "detail": "Subscription created successfully",
                "subscription_id": subscription.id,
                "payment_id": payment.id,
                "amount": float(plan.monthly_price),
                "due_date": due_date.isoformat(),
                "subscription_end_date": end_date.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerSubscriptionView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sub = CustomerSubscription.objects.select_related("plan").filter(
            user=request.user,
            is_active=True,
        ).first()

        # CHANGED: use local date and compute rolling subscription period window
        today = timezone.localdate()

        total_pickups = 0
        total_weight = Decimal("0")
        period_start = None
        period_end = None

        if sub:
            # rolling 30-day window based on end_date; clamp to [start_date, end_date] and today
            sub_start = sub.start_date
            sub_end = sub.end_date or today

            period_end = min(sub_end, today)

            # If end_date exists, treat current cycle as last 30 days ending at end_date
            base_start = (sub_end - timedelta(days=30)) if sub.end_date else sub_start
            if base_start is None:
                base_start = today - timedelta(days=30)

            period_start = max(base_start, sub_start) if sub_start else base_start
            if period_start and period_end and period_end < period_start:
                # safety for edge cases
                period_start = period_end

            total_pickups = Order.objects.filter(
                user=request.user,
                order_type="monthly",
                pickup_date__gte=period_start,
                pickup_date__lte=period_end,
            ).count()

            # CHANGED: sum weights by pickup_date (not recorded_at date)
            agg = OrderWeight.objects.filter(
                order__user=request.user,
                order__order_type="monthly",
                order__pickup_date__gte=period_start,
                order__pickup_date__lte=period_end,
            ).aggregate(total=Sum("weight_kg"))
            total_weight = agg["total"] or Decimal("0")

        # pending payment unchanged
        pending_payment = None
        if sub:
            # If the 30-day period completed and there is no pending payment yet,
            # generate one so the customer can see the amount to pay.
            if sub.end_date and today >= sub.end_date:
                has_pending = Payment.objects.filter(
                    subscription=sub,
                    payment_type="monthly",
                    payment_status="pending",
                ).exists()
                if not has_pending:
                    due_date = today + timedelta(days=4)
                    Payment.objects.create(
                        user=request.user,
                        subscription=sub,
                        order=None,
                        amount=sub.plan.monthly_price,
                        payment_type="monthly",
                        payment_status="pending",
                        due_date=due_date,
                    )

            payment = Payment.objects.filter(
                subscription=sub,
                payment_type="monthly",
                payment_status="pending",
            ).order_by("due_date", "id").first()
            if payment:
                fine = None
                try:
                    fine = ensure_fine_for_payment(payment, today=today)
                except Exception:
                    fine = getattr(payment, "fine", None)

                is_overdue = bool(payment.due_date and payment.due_date < today)
                days_overdue = (today - payment.due_date).days if is_overdue else 0
                fine_amount = float(getattr(fine, "fine_amount", 0) or 0)
                total_due = float(payment.amount or 0) + fine_amount

                pending_payment = {
                    "id": payment.id,
                    "amount": float(payment.amount),
                    "due_date": payment.due_date.isoformat() if payment.due_date else None,
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue,
                    "fine_amount": fine_amount,
                    "fine_days": int(getattr(fine, "fine_days", 0) or 0),
                    "total_due": total_due,
                }

        # NEW: remaining weight (optional for UI)
        max_w = sub.plan.max_weight_per_month if (sub and sub.plan) else None
        remaining = None
        if max_w is not None:
            remaining = max(Decimal(str(max_w)) - Decimal(str(total_weight)), Decimal("0"))

        return Response(
            {
                "subscription": None if not sub else {
                    "id": sub.id,
                    "plan_id": sub.plan.id,
                    "plan": sub.plan.name,
                    "monthly_price": float(sub.plan.monthly_price),
                    "max_weight_per_month": float(sub.plan.max_weight_per_month),
                    "preferred_pickup_shift": sub.preferred_pickup_shift,
                    "start_date": sub.start_date.isoformat() if sub.start_date else None,
                    "end_date": sub.end_date.isoformat() if sub.end_date else None,
                },
                "usage": {
                    "total_pickups": total_pickups,
                    "total_weight": float(total_weight),
                    "remaining_weight": float(remaining) if remaining is not None else None,  # NEW
                    "period_start": period_start.isoformat() if period_start else None,      # NEW
                    "period_end": period_end.isoformat() if period_end else None,            # NEW
                },
                "pending_payment": pending_payment,
            },
            status=status.HTTP_200_OK,
        )


class CustomerCancelSubscriptionView(APIView):
    """Allow customer to cancel their subscription."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sub = CustomerSubscription.objects.filter(
            user=request.user,
            is_active=True
        ).first()

        if not sub:
            return Response(
                {"detail": "No active subscription found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        sub.is_active = False
        sub.end_date = date.today()
        sub.save(update_fields=["is_active", "end_date"])

        return Response(
            {"detail": "Subscription cancelled successfully"},
            status=status.HTTP_200_OK
        )


class CustomerPaySubscriptionView(APIView):
    """Mark subscription payment as paid.

    The next monthly payment should be generated only when the 30-day period completes
    (not immediately after paying).
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        payment_id = request.data.get("payment_id")
        if not payment_id:
            return Response({"detail": "payment_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.select_related("subscription", "subscription__plan").get(
                id=payment_id,
                user=request.user,
                payment_status="pending",
            )
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found or already paid"}, status=status.HTTP_404_NOT_FOUND)

        # Mark current payment as paid
        payment.payment_status = "paid"
        payment.payment_date = date.today()
        payment.save(update_fields=["payment_status", "payment_date"])

        # NEW: clear any fine record for this payment
        try:
            from payments.models import PaymentFine
            PaymentFine.objects.filter(payment=payment).delete()
        except Exception:
            pass

        # If this is a subscription payment:
        # - The FIRST payment created at subscription signup covers the initial 30-day period,
        #   so paying it should NOT extend end_date (otherwise it becomes ~60 days).
        # - Renewal payments (generated when the current period completes) extend end_date by +30.
        if payment.subscription and payment.subscription.is_active:
            sub = payment.subscription

            first_monthly_payment_id = (
                Payment.objects.filter(subscription=sub, payment_type="monthly")
                .order_by("id")
                .values_list("id", flat=True)
                .first()
            )

            is_first_monthly_payment = (first_monthly_payment_id == payment.id)
            if not is_first_monthly_payment:
                # Only renew (extend) when the current 30-day period has completed.
                # This prevents a brand-new subscription (end_date in the future)
                # from becoming ~60 days just because the first payment was paid.
                if sub.end_date and date.today() < sub.end_date:
                    pass
                else:
                    base_end = sub.end_date or date.today()
                    sub.end_date = base_end + timedelta(days=30)
                    sub.save(update_fields=["end_date"])

            # Safety: clear any duplicate pending monthly payments created by older logic.
            Payment.objects.filter(
                subscription=sub,
                payment_type="monthly",
                payment_status="pending",
            ).exclude(id=payment.id).delete()

            # NEW: after payment, resume service by ensuring today's monthly order exists
            try:
                from orders import views as order_views
                today_local = timezone.localdate()
                order_views._ensure_monthly_orders_for_subscription(sub, today_local, today_local)
            except Exception:
                pass

        return Response({"detail": "Payment successful"}, status=status.HTTP_200_OK)


class CustomerSkipDayView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic  # NEW: keep skip + cancel consistent
    def post(self, request):
        sub = CustomerSubscription.objects.filter(user=request.user, is_active=True).first()
        if not sub:
            return Response({"detail": "no active subscription"}, status=status.HTTP_400_BAD_REQUEST)

        raw = request.data.get("date")
        if raw in [None, ""]:
            skip_d = timezone.localdate()
        else:
            try:
                skip_d = date.fromisoformat(str(raw))
            except Exception:
                return Response({"detail": "invalid date (use YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)

        reason = (request.data.get("reason") or "").strip() or "No Pickup Today"

        # NEW: if monthly order exists and is already progressed, don't allow skipping
        monthly_order = (
            Order.objects.filter(user=request.user, order_type="monthly", pickup_date=skip_d)
            .order_by("-id")
            .first()
        )
        if monthly_order and monthly_order.status != "scheduled":
            return Response(
                {"detail": f"Cannot mark no-pickup now (order already '{monthly_order.status}')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        skip_obj, created = SubscriptionSkipDay.objects.get_or_create(
            subscription=sub,
            skip_date=skip_d,
            defaults={"reason": reason},
        )

        # NEW: if an order exists for that day and is scheduled, cancel it too
        if monthly_order and monthly_order.status == "scheduled":
            monthly_order.status = "cancelled"
            monthly_order.save(update_fields=["status"])
            OrderStatusLog.objects.create(order=monthly_order, status="cancelled", changed_by=request.user)

        return Response(
            {
                "detail": "skip recorded",
                "skip_date": str(skip_d),
                "already_marked": (not created),
                "cancelled_order_id": monthly_order.id if monthly_order else None,
            },
            status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
        )
