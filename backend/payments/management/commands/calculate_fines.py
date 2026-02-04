"""
Management command to calculate fines for overdue payments.
Run daily via cron/scheduler:
    python manage.py calculate_fines
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date
from decimal import Decimal
from payments.models import Payment, PaymentFine


# Fine rate per day (as per README: ₹10 per day for demand orders)
FINE_PER_DAY = Decimal("10.00")


class Command(BaseCommand):
    help = "Calculate and update fines for overdue payments"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without actually updating",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = date.today()
        
        # Get all pending payments that are overdue
        overdue_payments = Payment.objects.filter(
            payment_status="pending",
            due_date__lt=today,
        )
        
        updated_count = 0
        
        for payment in overdue_payments:
            days_overdue = (today - payment.due_date).days
            fine_amount = FINE_PER_DAY * days_overdue
            
            if dry_run:
                self.stdout.write(
                    f"  [DRY-RUN] Payment #{payment.id}: {days_overdue} days overdue, fine ₹{fine_amount}"
                )
            else:
                with transaction.atomic():
                    PaymentFine.objects.update_or_create(
                        payment=payment,
                        defaults={
                            "fine_amount": fine_amount,
                            "fine_days": days_overdue,
                        },
                    )
            
            updated_count += 1
        
        action = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(f"{action} fines for {updated_count} overdue payment(s)")
        )
