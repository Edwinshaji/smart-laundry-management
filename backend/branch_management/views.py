from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum
from accounts.models import User
from locations.models import Branch, ServiceZone
from orders.models import Order
from payments.models import Payment
from .models import BranchManager, DeliveryStaff
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

def _get_branch(request):
    if request.user and request.user.is_authenticated:
        try:
            return BranchManager.objects.select_related("branch").get(user=request.user).branch
        except BranchManager.DoesNotExist:
            pass
    branch_id = request.query_params.get("branch_id") or request.data.get("branch_id")
    if branch_id:
        try:
            return Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            return None
    return None

class ManagerOverviewView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)

        revenue = Payment.objects.filter(
            order__branch=branch,
            payment_status="paid",
        ).aggregate(total=Sum("amount"))["total"] or 0

        orders_total = Order.objects.filter(branch=branch).count()
        active_staff = DeliveryStaff.objects.filter(branch=branch).count()

        return Response(
            {
                "revenue": float(revenue),
                "ordersTotal": orders_total,
                "activeStaff": active_staff,
            },
            status=status.HTTP_200_OK,
        )

class ManagerStaffView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        staff = DeliveryStaff.objects.select_related("user").filter(branch=branch)
        data = [
            {
                "id": s.id,
                "user_id": s.user.id,
                "name": s.user.full_name,
                "email": s.user.email,
                "phone": s.user.phone,
                "approved": s.user.is_approved,
                "status": "Active" if s.user.is_active else "Suspended",
            }
            for s in staff
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        user_id = request.data.get("user_id")
        action = request.data.get("action")
        try:
            staff = DeliveryStaff.objects.select_related("user").get(user_id=user_id, branch=branch)
        except DeliveryStaff.DoesNotExist:
            return Response({"detail": "staff not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == "approve":
            staff.user.is_approved = True
            staff.user.save(update_fields=["is_approved"])
            return Response({"detail": "Approved"}, status=status.HTTP_200_OK)
        if action == "reject":
            staff.user.is_active = False
            staff.user.save(update_fields=["is_active"])
            return Response({"detail": "Rejected"}, status=status.HTTP_200_OK)

        return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

class ManagerZonesView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        zones = ServiceZone.objects.filter(branch=branch).order_by("zone_name")
        data = [{"id": z.id, "zone_name": z.zone_name, "pincodes": z.pincodes} for z in zones]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        zone_name = request.data.get("zone_name")
        pincodes = request.data.get("pincodes") or []
        if not zone_name:
            return Response({"detail": "zone_name required"}, status=status.HTTP_400_BAD_REQUEST)
        zone = ServiceZone.objects.create(branch=branch, zone_name=zone_name, pincodes=pincodes)
        return Response({"id": zone.id}, status=status.HTTP_201_CREATED)

class ManagerZoneDetailView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk=None):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            zone = ServiceZone.objects.get(id=pk, branch=branch)
        except ServiceZone.DoesNotExist:
            return Response({"detail": "zone not found"}, status=status.HTTP_404_NOT_FOUND)

        zone.zone_name = request.data.get("zone_name", zone.zone_name)
        if "pincodes" in request.data:
            zone.pincodes = request.data.get("pincodes")
        zone.save(update_fields=["zone_name", "pincodes"])
        return Response({"id": zone.id}, status=status.HTTP_200_OK)

    def delete(self, request, pk=None):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            zone = ServiceZone.objects.get(id=pk, branch=branch)
        except ServiceZone.DoesNotExist:
            return Response({"detail": "zone not found"}, status=status.HTTP_404_NOT_FOUND)
        zone.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ManagerOrdersView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        orders = Order.objects.select_related("user").filter(branch=branch).order_by("-created_at")[:200]
        data = [
            {
                "id": o.id,
                "customer": o.user.full_name,
                "order_type": o.order_type,
                "status": o.status,
                "pickup_date": o.pickup_date,
            }
            for o in orders
        ]
        return Response(data, status=status.HTTP_200_OK)

class ManagerBranchView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "branch_name": branch.branch_name,
                "address": branch.address,
                "latitude": branch.latitude,
                "longitude": branch.longitude,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        branch = _get_branch(request)
        if not branch:
            return Response({"detail": "branch not found"}, status=status.HTTP_400_BAD_REQUEST)
        branch.branch_name = request.data.get("branch_name", branch.branch_name)
        branch.address = request.data.get("address", branch.address)
        if "latitude" in request.data:
            branch.latitude = request.data.get("latitude")
        if "longitude" in request.data:
            branch.longitude = request.data.get("longitude")
        branch.save()
        return Response({"detail": "Branch updated"}, status=status.HTTP_200_OK)
