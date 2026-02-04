from django.shortcuts import render
from decimal import Decimal, InvalidOperation
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from branch_management.models import DeliveryStaff
from .models import Order, OrderWeight, OrderStatusLog
from datetime import date, timedelta
from locations.models import CustomerAddress, ServiceZone, Branch
from payments.models import Payment
from subscriptions.models import CustomerSubscription
from django.contrib.auth import update_session_auth_hash
from django.conf import settings
from django.utils import timezone  # NEW

from subscriptions.models import SubscriptionSkipDay

# Price per kg for demand orders
DEMAND_PRICE_PER_KG = Decimal("50.00")  # ₹50 per kg
DEMAND_MINIMUM_CHARGE = Decimal("100.00")  # Minimum ₹100 per order

# NEW: placeholder due_date to satisfy DB NOT NULL (if your DB still has NOT NULL); will be replaced on delivery
DEMAND_DUE_DATE_PLACEHOLDER_DAYS = 3650  # ~10 years

MONTHLY_ORDER_GENERATE_DAYS_AHEAD = 3  # NEW: keep small; runs on every dashboard load

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

def _get_staff(request):
    if request.user and request.user.is_authenticated:
        try:
            return DeliveryStaff.objects.select_related("branch").get(user=request.user)
        except DeliveryStaff.DoesNotExist:
            return None
    return None

def _format_address(address):
    try:
        return str(address)
    except Exception:
        return ""

def _get_available_branches_for_pincode(pincode):
    pincode = str(pincode).strip() if pincode is not None else ""
    if not pincode:
        return Branch.objects.none()
    zones = ServiceZone.objects.select_related("branch").filter(
        pincodes__contains=[pincode],
        branch__is_active=True,
    )
    branch_ids = {z.branch_id for z in zones if z.branch_id}
    return Branch.objects.filter(id__in=branch_ids, is_active=True)

def _get_service_zone_for_pincode(pincode, branch_id=None):
    pincode = str(pincode).strip() if pincode is not None else ""
    if not pincode:
        return None
    qs = ServiceZone.objects.select_related("branch").filter(
        pincodes__contains=[pincode],
        branch__is_active=True,
    )
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    return qs.first()

def _resolve_delivery_staff_for_zone(zone):
    if not zone:
        return None
    qs = DeliveryStaff.objects.select_related("user").filter(
        zone=zone,
        user__is_active=True,
        user__is_approved=True,
    )
    available = qs.filter(is_available=True).order_by("id").first()
    return available or qs.order_by("id").first()

def _resolve_branch_for_address(address, branch_id=None):
    pincode = getattr(address, "pincode", None)
    zone = _get_service_zone_for_pincode(pincode, branch_id=branch_id)
    return zone.branch if zone else None

def _require_delivery_user(request):
    """Guard for delivery endpoints - returns (staff, None) or (None, error_response)."""
    # Check authentication first
    if not request.user or not request.user.is_authenticated:
        return None, Response(
            {"detail": "Not authenticated. Session may have expired or cookie not sent."},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if user has correct role
    if request.user.role != "delivery_staff":
        return None, Response(
            {"detail": f"Access denied. Your role is '{request.user.role}', not 'delivery_staff'."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check approval status
    if not request.user.is_approved:
        return None, Response(
            {"detail": "Your account is awaiting approval by your branch manager."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check for DeliveryStaff record
    try:
        staff = DeliveryStaff.objects.select_related("branch", "zone").get(user=request.user)
    except DeliveryStaff.DoesNotExist:
        return None, Response(
            {"detail": "No delivery staff profile found. Please contact your branch manager."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    return staff, None


class DeliveryOrdersView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff, err = _require_delivery_user(request)
        if err:
            return err

        # NEW: ensure monthly orders exist so dashboard can show them
        try:
            _ensure_monthly_orders_for_all()
        except Exception:
            pass

        status_filter = request.query_params.get("status")
        order_type = request.query_params.get("order_type")  # "demand" | "monthly" | None

        qs = (
            Order.objects.select_related("user", "address", "branch")
            .filter(delivery_staff=staff)
            .order_by("pickup_date")
        )

        if status_filter:
            qs = qs.filter(status=status_filter)

        if order_type in {"demand", "monthly"}:
            qs = qs.filter(order_type=order_type)

        data = []
        for o in qs:
            # UI uses this for "Deliver Today / Deliver Later" grouping.
            # Demand: assume delivery is next day by default (no explicit delivery_date field in model).
            expected_delivery_date = o.pickup_date + timedelta(days=1) if o.order_type == "demand" else o.pickup_date

            data.append(
                {
                    "id": o.id,
                    "customer": o.user.full_name,
                    "customer_phone": o.user.phone,
                    "customer_email": o.user.email,
                    "address": _format_address(o.address),
                    "full_address": getattr(o.address, "full_address", ""),
                    "pincode": getattr(o.address, "pincode", ""),
                    "latitude": str(getattr(o.address, "latitude", "")) if getattr(o.address, "latitude", None) is not None else "",
                    "longitude": str(getattr(o.address, "longitude", "")) if getattr(o.address, "longitude", None) is not None else "",
                    "branch_name": o.branch.branch_name if o.branch else None,
                    "pickup_date": o.pickup_date,
                    "pickup_shift": o.pickup_shift,
                    "expected_delivery_date": expected_delivery_date,
                    "status": o.status,
                    "order_type": o.order_type,
                }
            )

        return Response(data, status=status.HTTP_200_OK)

class DeliveryOrderStatusView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk=None):
        staff, err = _require_delivery_user(request)
        if err:
            return err

        try:
            order = Order.objects.select_related("delivery_staff", "user").get(id=pk, delivery_staff=staff)
        except Order.DoesNotExist:
            return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        allowed = {s for s, _ in Order.STATUS_CHOICES}
        if new_status not in allowed:
            return Response({"detail": "invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == "picked_up" and order.status != "scheduled":
            return Response({"detail": "invalid transition"}, status=status.HTTP_400_BAD_REQUEST)
        if new_status == "reached_branch" and order.status != "picked_up":
            return Response({"detail": "invalid transition"}, status=status.HTTP_400_BAD_REQUEST)
        if new_status == "delivered" and order.status != "ready_for_delivery":
            return Response({"detail": "invalid transition"}, status=status.HTTP_400_BAD_REQUEST)

        if new_status not in {"picked_up", "reached_branch", "delivered"}:
            return Response({"detail": "status not allowed"}, status=status.HTTP_400_BAD_REQUEST)

        weight_val = request.data.get("weight_kg")

        with transaction.atomic():
            if new_status == "picked_up":
                if weight_val in [None, ""]:
                    return Response({"detail": "weight_kg required"}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    weight = Decimal(str(weight_val))
                except (InvalidOperation, TypeError):
                    return Response({"detail": "invalid weight_kg"}, status=status.HTTP_400_BAD_REQUEST)
                if weight <= 0:
                    return Response({"detail": "invalid weight_kg"}, status=status.HTTP_400_BAD_REQUEST)

                OrderWeight.objects.update_or_create(
                    order=order,
                    defaults={"weight_kg": weight, "recorded_by": request.user},
                )
                
                # Update payment amount based on actual weight for demand orders
                if order.order_type == "demand":
                    _update_demand_order_payment_amount(order, weight)

            order.status = new_status
            order.save(update_fields=["status"])

            OrderStatusLog.objects.create(
                order=order,
                status=new_status,
                changed_by=request.user,
            )

            # Set payment due date when order is delivered
            if new_status == "delivered" and order.order_type == "demand":
                _finalize_demand_order_payment(order)

        return Response({"detail": "Updated"}, status=status.HTTP_200_OK)


def _create_demand_order_payment(order):
    """Create a pending payment row for a new demand order WITHOUT a real amount yet.

    DB constraint: payments.amount cannot be NULL in current schema.
    So we store 0.00 as "TBD" until weight is recorded.
    """
    if Payment.objects.filter(order=order).exists():
        return None

    placeholder_due = date.today() + timedelta(days=DEMAND_DUE_DATE_PLACEHOLDER_DAYS)

    payment = Payment.objects.create(
        user=order.user,
        order=order,
        subscription=None,
        amount=Decimal("0.00"),  # CHANGED: use 0.00 instead of None (DB NOT NULL)
        payment_type="demand",
        payment_status="pending",
        due_date=placeholder_due,
    )
    return payment


def _update_demand_order_payment_amount(order, weight_kg):
    """Calculate and store demand payment amount based on recorded weight."""
    try:
        payment = Payment.objects.get(order=order, payment_status="pending")
        calculated_amount = weight_kg * DEMAND_PRICE_PER_KG
        payment.amount = max(calculated_amount, DEMAND_MINIMUM_CHARGE)
        payment.save(update_fields=["amount"])
    except Payment.DoesNotExist:
        pass


def _finalize_demand_order_payment(order):
    """Set real due date when order is delivered (1 day after delivery)."""
    try:
        payment = Payment.objects.get(order=order, payment_status="pending")
        payment.due_date = date.today() + timedelta(days=1)
        payment.save(update_fields=["due_date"])
    except Payment.DoesNotExist:
        pass


class DeliveryAvailabilityView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff, err = _require_delivery_user(request)
        if err:
            return err
        return Response({"is_available": staff.is_available}, status=status.HTTP_200_OK)

    def patch(self, request):
        staff, err = _require_delivery_user(request)
        if err:
            return err

        raw = request.data.get("is_available")
        if isinstance(raw, bool):
            value = raw
        elif isinstance(raw, (int, float)):
            value = bool(raw)
        elif isinstance(raw, str):
            value = raw.strip().lower() in {"1", "true", "yes", "y"}
        else:
            value = False

        staff.is_available = value
        staff.save(update_fields=["is_available"])
        return Response({"is_available": staff.is_available}, status=status.HTTP_200_OK)

class CustomerOverviewView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_orders = Order.objects.filter(
            user=request.user,
            status__in=["scheduled", "picked_up", "reached_branch", "washing", "ready_for_delivery"],
        ).count()

        pending_payments = Payment.objects.filter(
            user=request.user,
            payment_status="pending",
        ).count()

        active_subscription = CustomerSubscription.objects.filter(
            user=request.user,
            is_active=True,
        ).exists()

        # NEW: today’s subscription pickup (monthly order) for overview-card
        today = date.today()
        todays_monthly = (
            Order.objects.filter(user=request.user, order_type="monthly", pickup_date=today)
            .order_by("-id")
            .first()
        )

        today_subscription_order = None
        if todays_monthly:
            today_subscription_order = {
                "id": todays_monthly.id,
                "pickup_date": todays_monthly.pickup_date,
                "pickup_shift": todays_monthly.pickup_shift,
                "status": todays_monthly.status,
            }

        return Response(
            {
                "activeOrders": active_orders,
                "pendingPayments": pending_payments,
                "activeSubscription": active_subscription,
                "todaySubscriptionOrder": today_subscription_order,  # NEW
            },
            status=status.HTTP_200_OK,
        )

def _update_customer_demand_order(order, request):
    # NOTE: must be defined before CustomerOrderDetailView.put calls it
    if order.order_type != "demand" or order.status != "scheduled":
        return Response({"detail": "order cannot be edited"}, status=status.HTTP_400_BAD_REQUEST)

    address = order.address
    address_id = request.data.get("address_id")
    if address_id not in [None, ""]:
        try:
            address = CustomerAddress.objects.get(id=address_id, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({"detail": "address not found"}, status=status.HTTP_404_NOT_FOUND)

    branch_id = request.data.get("branch_id")
    if address_id not in [None, ""] or branch_id not in [None, ""]:
        zone = _get_service_zone_for_pincode(getattr(address, "pincode", None), branch_id=branch_id)
        branch = zone.branch if zone else None
        if not branch:
            return Response({"detail": "unable to resolve branch for address"}, status=status.HTTP_400_BAD_REQUEST)
        order.branch = branch
        order.address = address
        order.delivery_staff = _resolve_delivery_staff_for_zone(zone)

    pickup_shift = request.data.get("pickup_shift")
    if pickup_shift:
        if pickup_shift not in {"morning", "evening"}:
            return Response({"detail": "invalid pickup_shift"}, status=status.HTTP_400_BAD_REQUEST)
        order.pickup_shift = pickup_shift

    pickup_date = request.data.get("pickup_date")
    if pickup_date:
        order.pickup_date = pickup_date

    order.save()
    return None

class CustomerOrdersView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # NEW: ensure this customer's monthly orders exist too
        try:
            sub = CustomerSubscription.objects.select_related("user").filter(user=request.user, is_active=True).first()
            _ensure_monthly_orders_for_subscription(sub)
        except Exception:
            pass

        status_filter = request.query_params.get("status")

        # CHANGED: customer Orders page should list ONLY demand orders
        qs = (
            Order.objects.select_related("branch", "address")
            .filter(user=request.user, order_type="demand")
            .order_by("-created_at")
        )
        if status_filter:
            qs = qs.filter(status=status_filter)

        order_ids = [o.id for o in qs]
        payments = Payment.objects.filter(order_id__in=order_ids)
        payment_map = {p.order_id: p for p in payments}

        data = []
        for o in qs:
            payment = payment_map.get(o.id)

            # CHANGED: treat 0/None as not-calculated => send None
            amt = None
            if payment and payment.amount not in [None, 0]:
                amt = float(payment.amount)

            data.append({
                "id": o.id,
                "order_type": o.order_type,
                "status": o.status,
                "pickup_date": o.pickup_date,
                "pickup_shift": o.pickup_shift,
                "branch_id": o.branch_id,
                "branch_name": o.branch.branch_name if o.branch else None,
                "address_id": o.address_id,

                # NEW: address fields for UI
                "address_label": getattr(o.address, "address_label", None),
                "full_address": getattr(o.address, "full_address", None),
                "pincode": getattr(o.address, "pincode", None),

                "payment_id": payment.id if payment else None,
                "payment_status": payment.payment_status if payment else None,
                "payment_amount": amt,
            })

        return Response(data, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request):
        address_id = request.data.get("address_id")
        pickup_shift = request.data.get("pickup_shift")
        pickup_date = request.data.get("pickup_date")

        if not address_id or not pickup_shift or not pickup_date:
            return Response({"detail": "address_id, pickup_shift, pickup_date required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            address = CustomerAddress.objects.get(id=address_id, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({"detail": "address not found"}, status=status.HTTP_404_NOT_FOUND)

        branch_id = request.data.get("branch_id")
        zone = _get_service_zone_for_pincode(getattr(address, "pincode", None), branch_id=branch_id)
        branch = zone.branch if zone else None

        if not branch:
            return Response({"detail": "unable to resolve branch for address"}, status=status.HTTP_400_BAD_REQUEST)

        delivery_staff = _resolve_delivery_staff_for_zone(zone)

        order = Order.objects.create(
            user=request.user,
            branch=branch,
            address=address,
            delivery_staff=delivery_staff,
            order_type="demand",
            pickup_shift=pickup_shift,
            pickup_date=pickup_date,
            status="scheduled",
        )

        # Create payment for this order immediately (now DB-safe)
        payment = _create_demand_order_payment(order)

        return Response(
            {
                "id": order.id,
                "payment_id": payment.id if payment else None,
                "estimated_amount": float(DEMAND_MINIMUM_CHARGE),
                "message": "Order created. Final amount will be calculated based on weight at pickup.",
            },
            status=status.HTTP_201_CREATED,
        )

    def put(self, request):
        order_id = request.data.get("id") or request.query_params.get("id")
        if not order_id:
            return Response({"detail": "id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.select_related("address", "branch").get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

        err = _update_customer_demand_order(order, request)
        if err:
            return err
        return Response({"detail": "Updated"}, status=status.HTTP_200_OK)

    def delete(self, request):
        order_id = request.data.get("id") or request.query_params.get("id")
        if not order_id:
            return Response({"detail": "id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.order_type != "demand" or order.status != "scheduled":
            return Response({"detail": "order cannot be deleted"}, status=status.HTTP_400_BAD_REQUEST)

        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CustomerOrderDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk=None):
        try:
            order = Order.objects.select_related("address", "branch").get(id=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

        err = _update_customer_demand_order(order, request)
        if err:
            return err
        return Response({"detail": "Updated"}, status=status.HTTP_200_OK)

    def delete(self, request, pk=None):
        try:
            order = Order.objects.get(id=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.order_type != "demand" or order.status != "scheduled":
            return Response({"detail": "order cannot be deleted"}, status=status.HTTP_400_BAD_REQUEST)

        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class DeliveryProfileView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff, err = _require_delivery_user(request)
        if err:
            return err

        staff = DeliveryStaff.objects.select_related("user", "branch", "branch__city", "zone").get(id=staff.id)
        u = staff.user
        b = staff.branch
        z = staff.zone

        return Response(
            {
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "is_available": staff.is_available,
                "branch": {
                    "id": b.id if b else None,
                    "name": b.branch_name if b else None,
                    "address": b.address if b else None,
                    "city": b.city.name if getattr(b, "city", None) else None,
                    "state": b.city.state if getattr(b, "city", None) else None,
                },
                "zone": {
                    "id": z.id if z else None,
                    "zone_name": z.zone_name if z else None,
                    "pincodes": z.pincodes if z else [],
                },
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        staff, err = _require_delivery_user(request)
        if err:
            return err

        u = staff.user
        full_name = request.data.get("full_name")
        phone = request.data.get("phone")
        # (optional) email update – keep conservative; only update if provided
        email = request.data.get("email")

        if full_name not in [None, ""]:
            u.full_name = full_name
        if phone not in [None, ""]:
            u.phone = phone
        if email not in [None, ""]:
            u.email = email

        u.save(update_fields=["full_name", "phone", "email"])
        return Response({"detail": "Profile updated"}, status=status.HTTP_200_OK)

class DeliveryChangePasswordView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        staff, err = _require_delivery_user(request)
        if err:
            return err

        user = staff.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response({"detail": "Both old and new password required"}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(old_password):
            return Response({"detail": "Old password is incorrect"}, status=status.HTTP_400_BAD_REQUEST)
        if len(str(new_password)) < 6:
            return Response({"detail": "New password must be at least 6 characters"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)
        return Response({"detail": "Password changed"}, status=status.HTTP_200_OK)

class CustomerNoPickupTodayView(APIView):
    """
    Customer marks 'No Pickup Today' for their active subscription.
    - creates SubscriptionSkipDay(subscription, today)
    - if today's monthly order exists and is still 'scheduled', it is cancelled
    """
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        sub = CustomerSubscription.objects.filter(user=request.user, is_active=True).first()
        if not sub:
            return Response({"detail": "No active subscription found."}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        reason = (request.data.get("reason") or "No Pickup Today").strip()

        skip, created = SubscriptionSkipDay.objects.get_or_create(
            subscription=sub,
            skip_date=today,
            defaults={"reason": reason},
        )

        # If order already generated for today, cancel it (only if still scheduled)
        todays_order = (
            Order.objects.filter(user=request.user, order_type="monthly", pickup_date=today)
            .order_by("-id")
            .first()
        )

        if todays_order and todays_order.status != "scheduled":
            # too late to skip if already progressed
            return Response(
                {"detail": f"Cannot mark no-pickup now (order already '{todays_order.status}')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if todays_order and todays_order.status == "scheduled":
            todays_order.status = "cancelled"
            todays_order.save(update_fields=["status"])
            OrderStatusLog.objects.create(order=todays_order, status="cancelled", changed_by=request.user)

        return Response(
            {
                "detail": "Marked as no pickup for today.",
                "skip_date": str(today),
                "already_marked": (not created),
                "cancelled_order_id": todays_order.id if todays_order else None,
            },
            status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
        )
