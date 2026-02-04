from django.db import models
from accounts.models import User
from orders.models import Order
from subscriptions.models import CustomerSubscription


class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ("monthly", "Monthly"),
        ("demand", "Demand"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True
    )
    subscription = models.ForeignKey(
        "subscriptions.CustomerSubscription",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPE_CHOICES)
    payment_status = models.CharField(
        max_length=10, choices=PAYMENT_STATUS_CHOICES, default="pending"
    )
    payment_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Payment {self.id} - {self.user.full_name} - {self.payment_status}"


class PaymentFine(models.Model):
    payment = models.OneToOneField(
        Payment, on_delete=models.CASCADE, related_name="fine"
    )
    fine_amount = models.DecimalField(max_digits=10, decimal_places=2)
    fine_days = models.IntegerField()
    calculated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Fine for Payment {self.payment_id}"
