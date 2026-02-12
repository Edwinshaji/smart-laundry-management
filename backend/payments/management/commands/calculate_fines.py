"""
Management command to calculate fines for overdue payments.
Run daily via cron/scheduler:
    python manage.py calculate_fines
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from payments.models import Payment
from payments.services import compute_fine_amount, ensure_fine_for_payment


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
        today = timezone.localdate()
        
        # Get all pending payments that are overdue
        overdue_payments = Payment.objects.filter(payment_status="pending", due_date__isnull=False, due_date__lt=today)
        
        updated_count = 0
        
        for payment in overdue_payments:
            days_overdue = (today - payment.due_date).days
            fine_amount = compute_fine_amount(days_overdue=days_overdue)
            
            if dry_run:
                self.stdout.write(
                    f"  [DRY-RUN] Payment #{payment.id}: {days_overdue} days overdue, fine ₹{fine_amount}"
                )
            else:
                ensure_fine_for_payment(payment, today=today)
            
            updated_count += 1
        
        action = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(f"{action} fines for {updated_count} overdue payment(s)")
        )
