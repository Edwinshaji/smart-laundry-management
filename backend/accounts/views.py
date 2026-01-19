from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import login
from .serializers import UserRegisterSerializer, UserLoginSerializer
from .models import User

@method_decorator(csrf_exempt, name='dispatch')
class CustomerRegisterView(APIView):
    authentication_classes = []  # Disable SessionAuthentication CSRF check for this endpoint
    def post(self, request):
        data = request.data.copy()
        data["role"] = User.Role.CUSTOMER
        serializer = UserRegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save(role=User.Role.CUSTOMER)
            user.is_approved = True
            user.save(update_fields=["is_approved"])
            login(request, user)
            return Response({"message": "Registration successful"}, status=status.HTTP_201_CREATED)
        return Response({"message": "Invalid data", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class StaffRegisterView(APIView):
    authentication_classes = []  # Disable SessionAuthentication CSRF check for this endpoint
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            role = serializer.validated_data.get("role")
            if role not in {User.Role.BRANCH_MANAGER, User.Role.DELIVERY_STAFF, User.Role.SUPER_ADMIN}:
                return Response(
                    {"role": ["Invalid staff role."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user = serializer.save(is_staff=True)  # ensure staff flag is set
            user.is_approved = False
            user.save(update_fields=["is_approved", "is_staff"])
            return Response(
                {"message": "Registration submitted. Awaiting approval."},
                status=status.HTTP_201_CREATED
            )
        print("Staff register errors:", serializer.errors)
        return Response({"message": "Invalid data", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class CustomerLoginView(APIView):
    authentication_classes = []  # Disable SessionAuthentication CSRF check for this endpoint
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            return Response({"message": "Login successful", "role": user.role}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class StaffLoginView(APIView):
    authentication_classes = []  # Disable SessionAuthentication CSRF check for this endpoint
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            return Response({"message": "Login successful", "role": user.role}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
