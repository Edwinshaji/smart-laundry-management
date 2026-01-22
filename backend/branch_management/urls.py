from django.urls import path
from .views import (
    ManagerOverviewView,
    ManagerStaffView,
    ManagerZonesView,
    ManagerZoneDetailView,
    ManagerOrdersView,
    ManagerBranchView,
)

urlpatterns = [
    path("overview/", ManagerOverviewView.as_view(), name="manager-overview"),
    path("staff/", ManagerStaffView.as_view(), name="manager-staff"),
    path("zones/", ManagerZonesView.as_view(), name="manager-zones"),
    path("zones/<int:pk>/", ManagerZoneDetailView.as_view(), name="manager-zone-detail"),
    path("orders/", ManagerOrdersView.as_view(), name="manager-orders"),
    path("branch/", ManagerBranchView.as_view(), name="manager-branch"),
]
