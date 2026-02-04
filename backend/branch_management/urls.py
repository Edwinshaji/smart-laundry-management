from django.urls import path
from .views import (
    ManagerOverviewView,
    ManagerStaffView,
    ManagerStaffDetailView,
    ManagerApprovalsView,
    ManagerZonesView,
    ManagerZoneDetailView,
    ManagerOrdersView,
    ManagerBranchView,
)
from subscriptions.views import (
    ManagerSubscriptionsView,
    CustomerPlansListView,
    CustomerSubscriptionView,
    CustomerSubscribeView,
    CustomerCancelSubscriptionView,
    CustomerPaySubscriptionView,
)
from payments.views import ManagerMonthlyPaymentsView

urlpatterns = [
    path("overview/", ManagerOverviewView.as_view(), name="manager-overview"),
    path("staff/", ManagerStaffView.as_view(), name="manager-staff"),
    path("staff/<int:pk>/", ManagerStaffDetailView.as_view(), name="manager-staff-detail"),
    path("approvals/", ManagerApprovalsView.as_view(), name="manager-approvals"),
    path("zones/", ManagerZonesView.as_view(), name="manager-zones"),
    path("zones/<int:pk>/", ManagerZoneDetailView.as_view(), name="manager-zone-detail"),
    path("orders/", ManagerOrdersView.as_view(), name="manager-orders"),
    path("branch/", ManagerBranchView.as_view(), name="manager-branch"),
    path("subscriptions/", ManagerSubscriptionsView.as_view()),
    path("subscriptions/plans/", CustomerPlansListView.as_view()),
    path("subscriptions/me/", CustomerSubscriptionView.as_view()),
    path("subscriptions/subscribe/", CustomerSubscribeView.as_view()),
    path("subscriptions/cancel/", CustomerCancelSubscriptionView.as_view()),
    path("subscriptions/pay/", CustomerPaySubscriptionView.as_view()),
    path("monthly-payments/", ManagerMonthlyPaymentsView.as_view()),
]
