from django.db import models
from accounts.models import User


class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    max_weight_per_month = models.DecimalField(max_digits=6, decimal_places=2)
    description = models.TextField()

    def __str__(self):
        return self.name


class CustomerSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)

    preferred_pickup_shift = models.CharField(
        max_length=10,
        choices=[("morning", "Morning"), ("evening", "Evening")]
    )

    is_active = models.BooleanField(default=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.full_name} - {self.plan.name}"


class SubscriptionSkipDay(models.Model):
    subscription = models.ForeignKey(CustomerSubscription, on_delete=models.CASCADE)
    skip_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("subscription", "skip_date")
