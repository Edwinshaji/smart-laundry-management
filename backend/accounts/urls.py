from django.urls import path
from .views import (
    CsrfTokenView,
    CustomerRegisterView,
    StaffRegisterView,
    CustomerLoginView,
    StaffLoginView,
    CustomerChangePasswordView,
)

urlpatterns = [
    path('csrf/', CsrfTokenView.as_view(), name='csrf'),
    path('customer/register/', CustomerRegisterView.as_view(), name='customer-register'),
    path('staff/register/', StaffRegisterView.as_view(), name='staff-register'),
    path('customer/login/', CustomerLoginView.as_view(), name='customer-login'),
    path('staff/login/', StaffLoginView.as_view(), name='staff-login'),
    path('customer/change-password/', CustomerChangePasswordView.as_view(), name='customer-change-password'),
]