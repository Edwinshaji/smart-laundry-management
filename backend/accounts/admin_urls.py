from django.urls import path
from .views import AdminApprovalsView, AdminUsersView, AdminProfileView, AdminChangePasswordView

urlpatterns = [
    path('approvals/', AdminApprovalsView.as_view(), name='admin-approvals'),
    path('users/', AdminUsersView.as_view(), name='admin-users'),
    path('profile/', AdminProfileView.as_view(), name='admin-profile'),
    path('change-password/', AdminChangePasswordView.as_view(), name='admin-change-password'),
]
