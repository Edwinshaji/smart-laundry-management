"""
Management command to generate monthly subscription payments.
Run this on the 1st of each month via cron/scheduler:
    python manage.py generate_monthly_payments
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

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = date.today()
        month_str = today.strftime("%Y-%m")
        
        # Get all active subscriptions
        active_subs = CustomerSubscription.objects.select_related("plan", "user").filter(
            is_active=True,
            start_date__lte=today,
        )
        
        created_count = 0
        skipped_count = 0
        
        for sub in active_subs:
            # Check if payment for this month already exists
            existing = Payment.objects.filter(
                subscription=sub,
                payment_type="monthly",
                due_date__year=today.year,
                due_date__month=today.month,
            ).exists()
            
            if existing:
                skipped_count += 1
                if options["verbosity"] >= 2:
                    self.stdout.write(f"  Skipped: {sub.user.full_name} (already has payment for {month_str})")
                continue
            
            # Payment window: 1st to 4th of every month
            due_date = today.replace(day=4) if today.day <= 4 else today + timedelta(days=4)
            
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
