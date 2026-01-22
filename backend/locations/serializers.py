from rest_framework import serializers
from .models import City, Branch, ServiceZone, CustomerAddress

class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = '__all__'

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        # Exclude latitude and longitude from output, but allow for input
        fields = ['id', 'city', 'branch_name', 'address', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class ServiceZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceZone
        fields = ['id', 'branch', 'zone_name', 'pincodes']

class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAddress
        fields = ['id', 'user', 'address_label', 'full_address', 'pincode', 'latitude', 'longitude', 'is_default', 'created_at', 'updated_at']
