from django.shortcuts import render
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from accounts.models import User
from locations.models import Branch
from orders.models import Order
from .models import Payment

class AdminOverviewView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        total_revenue = Payment.objects.filter(payment_status="paid").aggregate(
            total=Sum("amount")
        )["total"] or 0

        active_branches = Branch.objects.filter(is_active=True).count()
        users_total = User.objects.count()
        orders_total = Order.objects.count()

        perf_qs = (
            Order.objects.values("branch__branch_name")
            .annotate(total=Count("id"))
            .order_by("-total")[:10]
        )
        branch_performance = [p["total"] for p in perf_qs] or [60, 40, 80, 50, 70, 90, 55, 35, 75, 65]

        return Response(
            {
                "weeklyRevenue": float(total_revenue),
                "activeBranches": active_branches,
                "onlineUsers": users_total,
                "ordersTotal": orders_total,
                "branchPerformance": branch_performance,
                "traffic": {"search": 40, "direct": 30, "social": 30},
            },
            status=status.HTTP_200_OK,
        )

class AdminPaymentsView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        payments = Payment.objects.select_related("user").order_by("-due_date")[:200]
        data = [
            {
                "id": p.id,
                "user": p.user.full_name,
                "type": p.payment_type,
                "amount": float(p.amount),
                "status": p.payment_status,
            }
            for p in payments
        ]
        return Response(data, status=status.HTTP_200_OK)

class AdminAnalyticsView(APIView):
    authentication_classes = []  # TODO: secure with proper auth

    def get(self, request):
        now = timezone.now()
        monthly_revenue = Payment.objects.filter(
            payment_status="paid",
            payment_date__year=now.year,
            payment_date__month=now.month,
        ).aggregate(total=Sum("amount"))["total"] or 0

        return Response(
            {
                "totalOrders": Order.objects.count(),
                "monthlyRevenue": float(monthly_revenue),
                "activeBranches": Branch.objects.filter(is_active=True).count(),
                "usersTotal": User.objects.count(),
            },
            status=status.HTTP_200_OK,
        )
