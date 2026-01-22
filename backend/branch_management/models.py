from django.db import models
from accounts.models import User
from locations.models import Branch, ServiceZone


class BranchManager(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)

    def __str__(self):
        return self.user.full_name


class DeliveryStaff(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    zone = models.ForeignKey(ServiceZone, on_delete=models.SET_NULL, null=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.user.full_name
