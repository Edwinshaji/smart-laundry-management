from django.urls import path
from .views import AdminBranchViewSet, AdminCityViewSet, CustomerAddressView, CustomerAddressDetailView, CustomerProfileView, CustomerAvailableBranchesView

urlpatterns = [
    path('branches/', AdminBranchViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-branches'),
    path('branches/<int:pk>/', AdminBranchViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='admin-branch-detail'),
    path('cities/', AdminCityViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-cities'),
    path('cities/<int:pk>/', AdminCityViewSet.as_view({'put': 'update', 'delete': 'destroy'}), name='admin-city-detail'),
    path("customer/profile/", CustomerProfileView.as_view()),
    path("customer/addresses/", CustomerAddressView.as_view()),
    path("customer/addresses/<int:pk>/", CustomerAddressDetailView.as_view()),
    path("customer/available-branches/", CustomerAvailableBranchesView.as_view()),
]
