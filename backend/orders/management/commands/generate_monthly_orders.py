from datetime import date, timedelta
from django.conf import settings
from django.core.management.base import BaseCommand

from subscriptions.models import CustomerSubscription, SubscriptionSkipDay
from orders.models import Order
from locations.models import CustomerAddress, ServiceZone
from branch_management.models import DeliveryStaff


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

    def handle(self, *args, **options):
        days_ahead = int(getattr(settings, "MONTHLY_ORDER_GENERATE_DAYS_AHEAD", 1))
        today = date.today()
        end = today + timedelta(days=days_ahead)

        subs = CustomerSubscription.objects.select_related("user").filter(is_active=True)
        created = 0
        skipped = 0

        for sub in subs:
            if sub.start_date and end < sub.start_date:
                continue
            if sub.end_date and sub.end_date < today:
                continue

            branch, addr, staff = _resolve_branch_and_staff_for_user(sub.user)
            if not branch or not addr:
                skipped += 1
                continue

            existing = set(
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
                    d += timedelta(days=1); continue
                if sub.end_date and d > sub.end_date:
                    break
                if d in existing or d in skip_dates:
                    d += timedelta(days=1); continue

                Order.objects.create(
                    user=sub.user,
                    branch=branch,
                    address=addr,
                    delivery_staff=staff,
                    order_type="monthly",
                    pickup_shift=sub.preferred_pickup_shift,
                    pickup_date=d,
                    status="scheduled",
                )
                created += 1
                d += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(f"Monthly orders created: {created}, subscriptions skipped (no addr/branch): {skipped}"))
