from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import login, update_session_auth_hash
from .serializers import UserRegisterSerializer, UserLoginSerializer
from .models import User
from branch_management.models import BranchManager, DeliveryStaff
from locations.models import Branch
from rest_framework.permissions import IsAuthenticated

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

            branch_id = request.data.get("branch_id")
            if role in {User.Role.BRANCH_MANAGER, User.Role.DELIVERY_STAFF} and not branch_id:
                return Response({"detail": "branch_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            user = serializer.save(is_staff=True)
            user.is_approved = False
            user.save(update_fields=["is_approved", "is_staff"])

            if role in {User.Role.BRANCH_MANAGER, User.Role.DELIVERY_STAFF}:
                try:
                    branch = Branch.objects.get(id=branch_id)
                except Branch.DoesNotExist:
                    return Response({"detail": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)

                if role == User.Role.BRANCH_MANAGER:
                    BranchManager.objects.create(user=user, branch=branch)
                if role == User.Role.DELIVERY_STAFF:
                    DeliveryStaff.objects.create(user=user, branch=branch, zone=None, is_available=True)

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

class AdminApprovalsView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        pending = User.objects.filter(
            role=User.Role.BRANCH_MANAGER,
            is_approved=False,
            is_active=True,
        ).order_by("created_at")
        data = [
            {
                "id": u.id,
                "name": u.full_name,
                "email": u.email,
                "role": u.role,
            }
            for u in pending
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        user_id = request.data.get("user_id")
        action = request.data.get("action")
        try:
            user = User.objects.get(id=user_id, role=User.Role.BRANCH_MANAGER)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "approve":
            user.is_approved = True
            user.save(update_fields=["is_approved"])
            return Response({"detail": "Approved"}, status=status.HTTP_200_OK)

        if action == "reject":
            user.is_active = False
            user.save(update_fields=["is_active"])
            return Response({"detail": "Rejected"}, status=status.HTTP_200_OK)

        return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

class AdminUsersView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        role = request.query_params.get("role")
        qs = User.objects.all().order_by("-created_at")
        if role:
            qs = qs.filter(role=role)
        data = [
            {
                "id": u.id,
                "name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "status": "Active" if u.is_active else "Suspended",
                "approved": u.is_approved,
            }
            for u in qs
        ]
        return Response(data, status=status.HTTP_200_OK)

class AdminProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
        })

    def put(self, request):
        user = request.user
        data = request.data
        user.full_name = data.get("full_name", user.full_name)
        user.email = data.get("email", user.email)
        user.phone = data.get("phone", user.phone)
        user.save(update_fields=["full_name", "email", "phone"])
        return Response({"detail": "Profile updated"}, status=status.HTTP_200_OK)

class AdminChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        if not old_password or not new_password:
            return Response({"detail": "Both old and new password required"}, status=status.HTTP_400_BAD_REQUEST)
        if not user.check_password(old_password):
            return Response({"detail": "Old password is incorrect"}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)
        return Response({"detail": "Password changed"}, status=status.HTTP_200_OK)
