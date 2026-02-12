"""
Generate daily subscription (monthly) pickup orders.

Note on payment calculation (demand orders):
- Amount is calculated when delivery staff records weight at pickup:
  amount = max(weight_kg * ₹10, ₹10)
- Implemented in backend/orders/views.py (see _update_demand_order_payment_amount and DeliveryOrderStatusView).
- Monthly subscription payments are fixed by plan price (not weight-based).

Note on "No Pickup Today":
- Skip-days are recorded only if the day's monthly order is still 'scheduled';
  once picked up/processed, skipping is blocked by the API.
- Customer UI should block "No Pickup Today" if already marked for the day
  or if today's monthly order is not in 'scheduled' state.

Dev note (403 on POST endpoints):
- If you use DRF SessionAuthentication, POST/PATCH/DELETE require CSRF.
- Frontend must send X-CSRFToken (from csrftoken cookie) and include credentials.
"""

from datetime import date
from django.core.management.base import BaseCommand
from django.utils import timezone

from subscriptions.models import CustomerSubscription, SubscriptionSkipDay
from orders.models import Order
from locations.models import CustomerAddress, ServiceZone
from branch_management.models import DeliveryStaff

# CHANGED: import the shared generator used by server startup/midnight jobs
from orders.views import _ensure_monthly_orders_for_all


def _resolve_branch_and_staff_for_user(user):
    addr = CustomerAddress.objects.filter(user=user).order_by("-id").first()
    if not addr or not getattr(addr, "pincode", None):
        return None, None, None

    pincode = str(addr.pincode).strip()
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


class Command(BaseCommand):
    help = "Generate daily subscription (monthly) orders for active subscriptions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            type=str,
            default="",
            help="Generate only for a specific date (YYYY-MM-DD). Default: today",
        )
        parser.add_argument(
            "--days-ahead",
            type=int,
            default=None,
            help="Generate for today..today+N (inclusive). If omitted, generates only today.",
        )

    def handle(self, *args, **options):
        raw_date = (options.get("date") or "").strip()
        days_ahead_opt = options.get("days_ahead")

        if raw_date:
            try:
                target = date.fromisoformat(raw_date)
            except Exception:
                self.stderr.write("Invalid --date. Use YYYY-MM-DD.")
                return
            res = _ensure_monthly_orders_for_all(for_date=target, lock_timeout_s=10)

        elif days_ahead_opt is not None:
            horizon = int(days_ahead_opt)
            res = _ensure_monthly_orders_for_all(days_ahead=horizon, lock_timeout_s=10)

        else:
            # CHANGED: default to today only
            res = _ensure_monthly_orders_for_all(for_date=timezone.localdate(), lock_timeout_s=10)

        self.stdout.write(
            self.style.SUCCESS(
                f"Monthly orders ensured. created={res.get('created')} scanned={res.get('scanned')} "
                f"range={res.get('start')}..{res.get('end')} lock={res.get('locked')}"
            )
        )
