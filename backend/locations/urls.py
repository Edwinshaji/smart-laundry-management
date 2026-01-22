from django.urls import path
from .views import AdminBranchViewSet, AdminCityViewSet

urlpatterns = [
    path('branches/', AdminBranchViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-branches'),
    path('branches/<int:pk>/', AdminBranchViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='admin-branch-detail'),
    path('cities/', AdminCityViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-cities'),
    path('cities/<int:pk>/', AdminCityViewSet.as_view({'put': 'update', 'delete': 'destroy'}), name='admin-city-detail'),
]
