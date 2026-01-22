from django.db import models
from accounts.models import User
from orders.models import Order
from subscriptions.models import CustomerSubscription


class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ("monthly", "Monthly"),
        ("demand", "Demand"),
    ]

    PAYMENT_STATUS = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)
    subscription = models.ForeignKey(CustomerSubscription, on_delete=models.SET_NULL, null=True, blank=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=10, choices=PAYMENT_TYPE_CHOICES)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS)

    due_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)


class PaymentFine(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    fine_amount = models.DecimalField(max_digits=8, decimal_places=2)
    fine_days = models.IntegerField()
    calculated_at = models.DateTimeField(auto_now_add=True)
