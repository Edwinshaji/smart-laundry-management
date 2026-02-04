from django.urls import path
from .views import (
    CustomerRegisterView,
    StaffRegisterView,
    CustomerLoginView,
    StaffLoginView,
    CustomerChangePasswordView,
)

urlpatterns = [
    path('customer/register/', CustomerRegisterView.as_view(), name='customer-register'),
    path('staff/register/', StaffRegisterView.as_view(), name='staff-register'),
    path('customer/login/', CustomerLoginView.as_view(), name='customer-login'),
    path('staff/login/', StaffLoginView.as_view(), name='staff-login'),
    path('customer/change-password/', CustomerChangePasswordView.as_view(), name='customer-change-password'),
]