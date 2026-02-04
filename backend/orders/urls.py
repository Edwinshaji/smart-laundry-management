from django.urls import path
from .views import (
    DeliveryOrdersView,
    DeliveryOrderStatusView,
    DeliveryAvailabilityView,
    CustomerOverviewView,
    CustomerOrdersView,
    CustomerOrderDetailView,
    DeliveryProfileView,
    DeliveryChangePasswordView,
)

urlpatterns = [
    path("delivery/orders/", DeliveryOrdersView.as_view()),
    path("delivery/orders/<int:pk>/status/", DeliveryOrderStatusView.as_view()),
    path("delivery/me/availability/", DeliveryAvailabilityView.as_view()),
    path("customer/orders/", CustomerOrdersView.as_view()),
    path("customer/orders/<int:pk>/", CustomerOrderDetailView.as_view()),
    path("customer/overview/", CustomerOverviewView.as_view()),
    path("delivery/profile/", DeliveryProfileView.as_view()),
    path("delivery/change-password/", DeliveryChangePasswordView.as_view()),
]
