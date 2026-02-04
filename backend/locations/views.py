from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import City, Branch, ServiceZone, CustomerAddress
from .serializers import CitySerializer, BranchSerializer, ServiceZoneSerializer, CustomerAddressSerializer
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from accounts.models import User

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

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

class CustomerProfileView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {"full_name": user.full_name, "email": user.email, "phone": user.phone},
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        user = request.user
        user.full_name = request.data.get("full_name", user.full_name)
        user.email = request.data.get("email", user.email)
        user.phone = request.data.get("phone", user.phone)
        user.save(update_fields=["full_name", "email", "phone"])
        return Response({"detail": "Profile updated"}, status=status.HTTP_200_OK)

def _clean_address_payload(request):
    model_fields = {f.name for f in CustomerAddress._meta.fields}
    data = request.data.copy()

    address_line = data.get("address_line") or data.get("address") or ""
    city = data.get("city") or ""
    state = data.get("state") or ""
    pincode = data.get("pincode") or data.get("pin_code") or ""

    if "latitude" in model_fields and "latitude" not in data:
        if "lat" in data:
            data["latitude"] = data.get("lat")
    if "longitude" in model_fields and "longitude" not in data:
        if "lng" in data or "lon" in data:
            data["longitude"] = data.get("lng") or data.get("lon")

    if "address_label" in model_fields and "address_label" not in data:
        data["address_label"] = address_line.strip() or "Home"

    if "full_address" in model_fields and "full_address" not in data:
        parts = [address_line, city, state, pincode]
        data["full_address"] = ", ".join([p for p in parts if p]).strip()

    if "pincode" in model_fields and "pincode" not in data:
        data["pincode"] = pincode

    for key in list(data.keys()):
        if data.get(key) in ["", None]:
            data.pop(key, None)

    return {k: v for k, v in data.items() if k in model_fields}

def _split_full_address(full_address):
    parts = [p.strip() for p in (full_address or "").split(",") if p.strip()]
    address_line = parts[0] if len(parts) > 0 else ""
    city = parts[1] if len(parts) > 1 else ""
    state = parts[2] if len(parts) > 2 else ""
    return address_line, city, state

class CustomerAddressView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = CustomerAddress.objects.filter(user=request.user).order_by("-id")
        data = CustomerAddressSerializer(addresses, many=True).data
        for item, addr in zip(data, addresses):
            address_line, city, state = _split_full_address(addr.full_address)
            item["label"] = str(addr)
            item["address_line"] = addr.address_label or address_line
            item["city"] = city
            item["state"] = state
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data

        address_label = data.get("address_label") or data.get("address_line") or "Home"
        full_address = data.get("full_address") or ""
        pincode = data.get("pincode") or data.get("pin_code") or ""
        latitude = data.get("latitude") or data.get("lat")
        longitude = data.get("longitude") or data.get("lng") or data.get("lon")

        if not full_address:
            parts = [
                data.get("address_line") or "",
                data.get("city") or "",
                data.get("state") or "",
                pincode,
            ]
            full_address = ", ".join([p for p in parts if p]).strip()

        if not full_address:
            return Response({"detail": "full_address or address_line required"}, status=status.HTTP_400_BAD_REQUEST)
        if not pincode:
            return Response({"detail": "pincode required"}, status=status.HTTP_400_BAD_REQUEST)
        if latitude is None or longitude is None:
            return Response({"detail": "latitude and longitude required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (ValueError, TypeError):
            return Response({"detail": "invalid latitude or longitude"}, status=status.HTTP_400_BAD_REQUEST)

        addr = CustomerAddress.objects.create(
            user=request.user,
            address_label=address_label,
            full_address=full_address,
            pincode=pincode,
            latitude=latitude,
            longitude=longitude,
            is_default=False,
        )

        return Response(
            {
                "id": addr.id,
                "address_label": addr.address_label,
                "full_address": addr.full_address,
                "pincode": addr.pincode,
                "latitude": str(addr.latitude),
                "longitude": str(addr.longitude),
                "label": str(addr),
            },
            status=status.HTTP_201_CREATED,
        )

class CustomerAddressDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, pk=None):
        try:
            addr = CustomerAddress.objects.get(id=pk, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({"detail": "address not found"}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if "address_label" in data or "address_line" in data:
            addr.address_label = data.get("address_label") or data.get("address_line") or addr.address_label
        if "full_address" in data:
            addr.full_address = data.get("full_address")
        if "pincode" in data or "pin_code" in data:
            addr.pincode = data.get("pincode") or data.get("pin_code") or addr.pincode
        if "latitude" in data or "lat" in data:
            lat = data.get("latitude") or data.get("lat")
            if lat is not None:
                addr.latitude = float(lat)
        if "longitude" in data or "lng" in data or "lon" in data:
            lng = data.get("longitude") or data.get("lng") or data.get("lon")
            if lng is not None:
                addr.longitude = float(lng)

        addr.save()

        return Response(
            {
                "id": addr.id,
                "address_label": addr.address_label,
                "full_address": addr.full_address,
                "pincode": addr.pincode,
                "latitude": str(addr.latitude),
                "longitude": str(addr.longitude),
                "label": str(addr),
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk=None):
        try:
            addr = CustomerAddress.objects.get(id=pk, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({"detail": "address not found"}, status=status.HTTP_404_NOT_FOUND)
        addr.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CustomerAvailableBranchesView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        address_id = request.query_params.get("address_id")
        if not address_id:
            return Response({"detail": "address_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            address = CustomerAddress.objects.get(id=address_id, user=request.user)
        except CustomerAddress.DoesNotExist:
            return Response({"detail": "address not found"}, status=status.HTTP_404_NOT_FOUND)

        pincode = str(getattr(address, "pincode", "")).strip()
        if not pincode:
            return Response({"detail": "pincode not found"}, status=status.HTTP_400_BAD_REQUEST)

        zones = ServiceZone.objects.select_related("branch", "branch__city").filter(
            pincodes__contains=[pincode],
            branch__is_active=True,
        )
        seen = set()
        data = []
        for z in zones:
            b = z.branch
            if not b or b.id in seen:
                continue
            seen.add(b.id)
            data.append(
                {
                    "id": b.id,

                    # NEW: fields most frontends use
                    "branch_name": b.branch_name,
                    "address": b.address,
                    "city": b.city.name if b.city else None,
                    "state": b.city.state if b.city else None,

                    # BACKCOMPAT: keep old key too
                    "name": b.branch_name,
                }
            )

        return Response(data, status=status.HTTP_200_OK)
