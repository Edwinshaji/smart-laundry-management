from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import City, Branch, ServiceZone, CustomerAddress
from .serializers import CitySerializer, BranchSerializer, ServiceZoneSerializer, CustomerAddressSerializer

class AdminCityViewSet(viewsets.ViewSet):
    authentication_classes = []  # TODO: secure with proper auth

    def list(self, request):
        cities = City.objects.all().order_by("name")
        data = [{"id": c.id, "name": c.name, "state": c.state} for c in cities]
        return Response(data, status=status.HTTP_200_OK)

    def create(self, request):
        name = request.data.get("name")
        state = request.data.get("state")
        if not name or not state:
            return Response({"detail": "name and state are required"}, status=status.HTTP_400_BAD_REQUEST)
        city, _ = City.objects.get_or_create(name=name, state=state)
        return Response({"id": city.id, "name": city.name, "state": city.state}, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            city = City.objects.get(id=pk)
        except City.DoesNotExist:
            return Response({"detail": "City not found"}, status=status.HTTP_404_NOT_FOUND)
        city.name = request.data.get("name", city.name)
        city.state = request.data.get("state", city.state)
        city.save(update_fields=["name", "state"])
        return Response({"id": city.id, "name": city.name, "state": city.state}, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            city = City.objects.get(id=pk)
        except City.DoesNotExist:
            return Response({"detail": "City not found"}, status=status.HTTP_404_NOT_FOUND)
        city.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class AdminBranchViewSet(viewsets.ViewSet):
    authentication_classes = []  # TODO: secure with proper auth

    def list(self, request):
        branches = Branch.objects.select_related("city").all().order_by("-created_at")
        data = [
            {
                "id": b.id,
                "name": b.branch_name,
                "city": b.city.name,
                "city_id": b.city.id,
                "state": b.city.state,
                "address": b.address,
                "latitude": float(b.latitude),
                "longitude": float(b.longitude),
                "status": "Active" if b.is_active else "Suspended",
            }
            for b in branches
        ]
        return Response(data, status=status.HTTP_200_OK)

    def create(self, request):
        data = request.data
        city_id = data.get("city_id")
        if not city_id:
            return Response({"detail": "city_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            city = City.objects.get(id=city_id)
        except City.DoesNotExist:
            return Response({"detail": "City not found"}, status=status.HTTP_404_NOT_FOUND)

        branch = Branch.objects.create(
            city=city,
            branch_name=data.get("branch_name"),
            address=data.get("address"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            is_active=True,
        )
        return Response({"id": branch.id}, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        try:
            b = Branch.objects.select_related("city").get(id=pk)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)
        data = {
            "id": b.id,
            "name": b.branch_name,
            "city": b.city.name,
            "city_id": b.city.id,
            "state": b.city.state,
            "address": b.address,
            "latitude": float(b.latitude),
            "longitude": float(b.longitude),
            "status": "Active" if b.is_active else "Suspended",
        }
        return Response(data, status=status.HTTP_200_OK)

    def update(self, request, pk=None):
        try:
            branch = Branch.objects.get(id=pk)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)

        city_id = request.data.get("city_id")
        if city_id:
            try:
                branch.city = City.objects.get(id=city_id)
            except City.DoesNotExist:
                return Response({"detail": "City not found"}, status=status.HTTP_404_NOT_FOUND)

        branch.branch_name = request.data.get("branch_name", branch.branch_name)
        branch.address = request.data.get("address", branch.address)

        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        if latitude not in [None, ""]:
            branch.latitude = latitude
        if longitude not in [None, ""]:
            branch.longitude = longitude

        if "is_active" in request.data:
            branch.is_active = request.data.get("is_active")

        branch.save()
        return Response({"id": branch.id}, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        try:
            branch = Branch.objects.get(id=pk)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found"}, status=status.HTTP_404_NOT_FOUND)
        branch.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
