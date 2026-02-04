from django.urls import path
from .views import (
    CustomerPlansListView,
    CustomerSubscriptionView,
    CustomerSubscribeView,
    CustomerCancelSubscriptionView,
    CustomerPaySubscriptionView,
    CustomerSkipDayView,
    AdminPlansView,
    AdminPlanDetailView,
)

urlpatterns = [
    # Customer subscription API (fixes /api/subscriptions/plans/ and /api/subscriptions/me/ 404)
    path("subscriptions/plans/", CustomerPlansListView.as_view()),
    path("subscriptions/me/", CustomerSubscriptionView.as_view()),
    path("subscriptions/subscribe/", CustomerSubscribeView.as_view()),
    path("subscriptions/cancel/", CustomerCancelSubscriptionView.as_view()),
    path("subscriptions/pay/", CustomerPaySubscriptionView.as_view()),
    path("subscriptions/skip/", CustomerSkipDayView.as_view()),

    # Admin plans API (support both patterns seen in your requests/logs)
    path("admin/plans/", AdminPlansView.as_view()),
    path("admin/plans/<int:pk>/", AdminPlanDetailView.as_view()),
    path("subscriptions/admin/plans/", AdminPlansView.as_view()),
    path("subscriptions/admin/plans/<int:pk>/", AdminPlanDetailView.as_view()),
]
