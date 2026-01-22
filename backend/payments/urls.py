from django.urls import path
from .views import AdminOverviewView, AdminPaymentsView, AdminAnalyticsView

urlpatterns = [
    path('overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('payments/', AdminPaymentsView.as_view(), name='admin-payments'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
]
