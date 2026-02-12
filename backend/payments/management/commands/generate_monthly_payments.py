"""payments.management.commands.generate_monthly_payments

Generate renewal payments for active subscriptions.

Rule:
- Do NOT create a new monthly payment immediately after a payment is marked paid.
- Create the next payment only when the current 30-day subscription period completes.

This is a rolling 30-day cycle (not calendar-month based).
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date, timedelta
from subscriptions.models import CustomerSubscription
from payments.models import Payment


class Command(BaseCommand):
    help = "Generate monthly payments for active subscriptions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating",
        )
        parser.add_argument(
            "--today",
            type=str,
            default=None,
            help="Override today's date (YYYY-MM-DD). Useful for testing.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        raw_today = options.get("today")
        if raw_today:
            try:
                today = date.fromisoformat(str(raw_today))
            except Exception:
                raise ValueError("--today must be in YYYY-MM-DD format")
        else:
            today = date.today()
        
        # Get all active subscriptions
        active_subs = CustomerSubscription.objects.select_related("plan", "user").filter(
            is_active=True,
            start_date__lte=today,
        )
        
        created_count = 0
        skipped_count = 0
        
        for sub in active_subs:
            # Idempotency: if there's any pending monthly payment, never create another.
            has_pending = Payment.objects.filter(
                subscription=sub,
                payment_type="monthly",
                payment_status="pending",
            ).exists()

            if has_pending:
                skipped_count += 1
                if options["verbosity"] >= 2:
                    self.stdout.write(f"  Skipped: {sub.user.full_name} (has pending monthly payment)")
                continue

            # Rolling renewal: generate only when the current period completes.
            # Subscription end_date is extended by +30 days upon successful payment.
            cycle_end = sub.end_date
            if not cycle_end:
                # Fallback for legacy/edge cases
                cycle_end = sub.start_date + timedelta(days=30)

            if today < cycle_end:
                skipped_count += 1
                if options["verbosity"] >= 2:
                    self.stdout.write(f"  Skipped: {sub.user.full_name} (not due yet)")
                continue

            # 4-day grace window from generation date
            due_date = today + timedelta(days=4)
            
            if dry_run:
                self.stdout.write(f"  [DRY-RUN] Would create: {sub.user.full_name} - ₹{sub.plan.monthly_price}")
            else:
                with transaction.atomic():
                    Payment.objects.create(
                        user=sub.user,
                        subscription=sub,
                        order=None,
                        amount=sub.plan.monthly_price,
                        payment_type="monthly",
                        payment_status="pending",
                        due_date=due_date,
                    )
            
            created_count += 1
        
        action = "Would create" if dry_run else "Created"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {created_count} payment(s), skipped {skipped_count} (already exist)"
            )
        )
