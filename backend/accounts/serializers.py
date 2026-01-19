from rest_framework import serializers
from .models import User
from django.contrib.auth import authenticate

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.Role.choices, required=False)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'phone', 'password', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        if not user.is_active or not user.is_approved:
            raise serializers.ValidationError("Account not active or not approved")
        if 'role' in data and user.role != data['role']:
            raise serializers.ValidationError("Role mismatch")
        data['user'] = user
        return data
