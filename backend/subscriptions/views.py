from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from branch_management.models import BranchManager
from locations.models import Branch
from orders.models import Order, OrderWeight
from .models import CustomerSubscription, SubscriptionPlan, SubscriptionSkipDay
from payments.models import Payment
from datetime import date, timedelta
from django.db.models import Sum
from django.db import transaction
from django.utils import timezone
from django.conf import settings  # NEW

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

def _ensure_monthly_orders_for_subscription(sub, days_ahead=MONTHLY_ORDER_GENERATE_DAYS_AHEAD):
    if not sub or not sub.is_active:
        return

    today = date.today()
    end = today + timedelta(days=int(days_ahead or 0))
    if sub.end_date and sub.end_date < today:
        return

    branch, addr, staff = _resolve_monthly_order_context_for_user(sub.user)
    if not branch or not addr:
        return

    existing_dates = set(
        Order.objects.filter(
            user=sub.user,
            order_type="monthly",
            pickup_date__gte=today,
            pickup_date__lte=end,
        ).values_list("pickup_date", flat=True)
    )
    skip_dates = set(
        SubscriptionSkipDay.objects.filter(
            subscription=sub,
            skip_date__gte=today,
            skip_date__lte=end,
        ).values_list("skip_date", flat=True)
    )

    d = today
    while d <= end:
        if sub.start_date and d < sub.start_date:
            d += timedelta(days=1)
            continue
        if sub.end_date and d > sub.end_date:
            break
        if d in existing_dates or d in skip_dates:
            d += timedelta(days=1)
            continue

        Order.objects.create(
            user=sub.user,
            branch=branch,
            address=addr,
            delivery_staff=staff,  # important: so delivery dashboard sees it
            order_type="monthly",
            pickup_shift=sub.preferred_pickup_shift,
            pickup_date=d,
            status="scheduled",
        )
        d += timedelta(days=1)

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

        # Create first month's payment - due immediately (4-day grace period)
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

        # NEW: generate today's (and next few) subscription orders immediately
        try:
            _ensure_monthly_orders_for_subscription(
                subscription,
                days_ahead=getattr(settings, "MONTHLY_ORDER_GENERATE_DAYS_AHEAD", 1),
            )
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

        today = date.today()
        month_start = today.replace(day=1)

        total_pickups = Order.objects.filter(
            user=request.user,
            order_type="monthly",
            pickup_date__gte=month_start,
            pickup_date__lte=today,
        ).count()

        total_weight = OrderWeight.objects.filter(
            order__user=request.user,
            order__order_type="monthly",
            recorded_at__date__gte=month_start,
            recorded_at__date__lte=today,
        ).aggregate(total=Sum("weight_kg"))["total"] or 0

        # Get pending payment if any
        pending_payment = None
        if sub:
            payment = Payment.objects.filter(
                subscription=sub,
                payment_status="pending"
            ).first()
            if payment:
                pending_payment = {
                    "id": payment.id,
                    "amount": float(payment.amount),
                    "due_date": payment.due_date.isoformat() if payment.due_date else None,
                }

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
    """Mark subscription payment as paid and generate next month's payment."""
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

        # If this is a subscription payment, extend subscription and create next payment
        if payment.subscription and payment.subscription.is_active:
            sub = payment.subscription
            
            # Extend subscription end date by 30 days from current end_date (or today if expired)
            current_end = sub.end_date if sub.end_date and sub.end_date >= date.today() else date.today()
            new_end_date = current_end + timedelta(days=30)
            sub.end_date = new_end_date
            sub.save(update_fields=["end_date"])

            # Create next month's payment (due 30 days from now, with 4-day grace period)
            next_due_date = new_end_date  # Payment due when subscription period ends
            
            # Check if next payment already exists
            existing_next = Payment.objects.filter(
                subscription=sub,
                payment_status="pending",
                due_date__gte=date.today(),
            ).exists()
            
            if not existing_next:
                Payment.objects.create(
                    user=request.user,
                    subscription=sub,
                    order=None,
                    amount=sub.plan.monthly_price,
                    payment_type="monthly",
                    payment_status="pending",
                    due_date=next_due_date,
                )

        return Response({"detail": "Payment successful"}, status=status.HTTP_200_OK)


class CustomerSkipDayView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sub = CustomerSubscription.objects.filter(user=request.user, is_active=True).first()
        if not sub:
            return Response({"detail": "no active subscription"}, status=status.HTTP_400_BAD_REQUEST)

        skip_date = request.data.get("date") or date.today().isoformat()
        SubscriptionSkipDay.objects.get_or_create(subscription=sub, skip_date=skip_date)
        return Response({"detail": "skip recorded"}, status=status.HTTP_201_CREATED)
