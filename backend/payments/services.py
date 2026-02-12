from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.utils import timezone

from .models import Payment, PaymentFine


FINE_PER_DAY = Decimal("10.00")


def _local_today(today: Optional[date] = None) -> date:
    return today or timezone.localdate()


def compute_fine_amount(*, days_overdue: int) -> Decimal:
    if days_overdue <= 0:
        return Decimal("0")
    return FINE_PER_DAY * int(days_overdue)


def ensure_fine_for_payment(payment: Payment, *, today: Optional[date] = None) -> Optional[PaymentFine]:
    """Ensure PaymentFine is up-to-date for a single payment.

    - If payment is pending and overdue -> update_or_create fine.
    - Else -> delete any existing fine.
    """
    if not payment:
        return None

    today_d = _local_today(today)
    due = getattr(payment, "due_date", None)

    is_overdue = (
        getattr(payment, "payment_status", None) == "pending"
        and due is not None
        and due < today_d
    )

    if not is_overdue:
        PaymentFine.objects.filter(payment=payment).delete()
        return None

    days_overdue = (today_d - due).days
    fine_amount = compute_fine_amount(days_overdue=days_overdue)

    with transaction.atomic():
        fine, _ = PaymentFine.objects.update_or_create(
            payment=payment,
            defaults={"fine_amount": fine_amount, "fine_days": days_overdue},
        )
    return fine


def ensure_fines_for_all_overdue(*, today: Optional[date] = None, limit: int | None = None) -> int:
    """Batch ensure fines for all overdue pending payments.

    Returns number of payments processed.
    """
    today_d = _local_today(today)
    qs = Payment.objects.filter(payment_status="pending", due_date__isnull=False, due_date__lt=today_d).order_by("id")
    if limit:
        qs = qs[: int(limit)]

    processed = 0
    for p in qs:
        ensure_fine_for_payment(p, today=today_d)
        processed += 1
    return processed
