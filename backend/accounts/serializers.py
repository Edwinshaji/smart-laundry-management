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
    role = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")
        role = data.get("role")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        if not user.check_password(password):
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "Account is deactivated."})

        # Check role if provided (staff login)
        if role and user.role != role:
            raise serializers.ValidationError({"detail": f"You are not registered as {role}."})

        # Check approval for roles that require it
        if user.role in ["branch_manager", "delivery_staff"] and not user.is_approved:
            if user.role == "branch_manager":
                raise serializers.ValidationError({"detail": "Awaiting Super Admin approval."})
            else:
                raise serializers.ValidationError({"detail": "Awaiting Branch Manager approval."})

        data["user"] = user
        return data
