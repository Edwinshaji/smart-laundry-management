from django.db import models
from accounts.models import User
from locations.models import Branch, CustomerAddress
from branch_management.models import DeliveryStaff


class Order(models.Model):
    ORDER_TYPE_CHOICES = [
        ("monthly", "Monthly"),
        ("demand", "Demand"),
    ]

    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("picked_up", "Picked Up"),
        ("reached_branch", "Reached Branch"),
        ("washing", "Washing"),
        ("ready_for_delivery", "Ready for Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    address = models.ForeignKey(CustomerAddress, on_delete=models.CASCADE)
    delivery_staff = models.ForeignKey(DeliveryStaff, on_delete=models.SET_NULL, null=True)

    order_type = models.CharField(max_length=10, choices=ORDER_TYPE_CHOICES)
    pickup_shift = models.CharField(max_length=10, choices=[("morning", "Morning"), ("evening", "Evening")])
    pickup_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id}"


class OrderWeight(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="recorded_weights")
    recorded_at = models.DateTimeField(auto_now_add=True)


class OrderStatusLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
