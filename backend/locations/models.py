from django.db import models
from accounts.models import User


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    state = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Branch(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE)
    branch_name = models.CharField(max_length=150)
    address = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.branch_name


class ServiceZone(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    zone_name = models.CharField(max_length=100)

    pincodes = models.JSONField()  
    # Example: ["682001", "682002", "682003"]

    def __str__(self):
        return f"{self.zone_name} - {self.branch.branch_name}"


class CustomerAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    address_label = models.CharField(max_length=50)
    full_address = models.TextField()

    pincode = models.CharField(max_length=10)  # ✅ One pincode per address

    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.address_label} - {self.pincode}"
