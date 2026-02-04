from django.urls import path
from .views import (
    AdminOverviewView,
    AdminPaymentsView,
    AdminAnalyticsView,
    CustomerPaymentsView,
    CustomerPayNowView,
    create_razorpay_order,
    verify_payment,
)

urlpatterns = [
    path('overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('payments/', AdminPaymentsView.as_view(), name='admin-payments'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path("customer/payments/", CustomerPaymentsView.as_view()),
    path("customer/payments/pay/", CustomerPayNowView.as_view()),  # NEW
    path("payments/create-order/", create_razorpay_order),
    path("payments/verify/", verify_payment),
]
