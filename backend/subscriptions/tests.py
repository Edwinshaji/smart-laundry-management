from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from payments.models import Payment
from subscriptions.models import SubscriptionPlan, CustomerSubscription

from decimal import Decimal
from django.utils import timezone

from locations.models import City, Branch, ServiceZone, CustomerAddress
from branch_management.models import DeliveryStaff
from orders.models import Order
from payments.models import PaymentFine


class SubscriptionBillingLogicTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			email="cust@example.com",
			password="pass12345",
			full_name="Test Customer",
			phone="9999999999",
			role=User.Role.CUSTOMER,
			is_active=True,
			is_approved=True,
		)
		self.plan = SubscriptionPlan.objects.create(
			name="Basic",
			monthly_price="199.00",
			max_weight_per_month="30.00",
			description="",
		)

	def test_first_monthly_payment_does_not_extend_end_date(self):
		today = date.today()
		sub = CustomerSubscription.objects.create(
			user=self.user,
			plan=self.plan,
			preferred_pickup_shift="morning",
			is_active=True,
			start_date=today,
			end_date=today + timedelta(days=30),
		)
		initial_end = sub.end_date
		p1 = Payment.objects.create(
			user=self.user,
			subscription=sub,
			order=None,
			amount=self.plan.monthly_price,
			payment_type="monthly",
			payment_status="pending",
			due_date=today + timedelta(days=4),
		)

		self.client.force_authenticate(user=self.user)
		res = self.client.post("/api/subscriptions/pay/", {"payment_id": p1.id}, format="json")
		self.assertEqual(res.status_code, 200)

		sub.refresh_from_db()
		self.assertEqual(sub.end_date, initial_end)

	def test_renewal_monthly_payment_extends_end_date_by_30_days(self):
		today = date.today()
		sub = CustomerSubscription.objects.create(
			user=self.user,
			plan=self.plan,
			preferred_pickup_shift="morning",
			is_active=True,
			start_date=today,
			end_date=today + timedelta(days=30),
		)
		# first payment paid (should not extend)
		p1 = Payment.objects.create(
			user=self.user,
			subscription=sub,
			order=None,
			amount=self.plan.monthly_price,
			payment_type="monthly",
			payment_status="pending",
			due_date=today + timedelta(days=4),
		)
		self.client.force_authenticate(user=self.user)
		self.client.post("/api/subscriptions/pay/", {"payment_id": p1.id}, format="json")
		sub.refresh_from_db()
		end_after_first = sub.end_date

		# renewal payment paid later (should extend)
		# Simulate that the current 30-day period has completed.
		sub.end_date = today - timedelta(days=1)
		sub.save(update_fields=["end_date"])

		p2 = Payment.objects.create(
			user=self.user,
			subscription=sub,
			order=None,
			amount=self.plan.monthly_price,
			payment_type="monthly",
			payment_status="pending",
			due_date=today + timedelta(days=4),
		)
		res2 = self.client.post("/api/subscriptions/pay/", {"payment_id": p2.id}, format="json")
		self.assertEqual(res2.status_code, 200)

		sub.refresh_from_db()
		self.assertEqual(sub.end_date, (today - timedelta(days=1)) + timedelta(days=30))


class SubscriptionFineAndResumeTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			email="cust2@example.com",
			password="pass12345",
			full_name="Fine Customer",
			phone="8888888888",
			role=User.Role.CUSTOMER,
			is_active=True,
			is_approved=True,
		)
		self.plan = SubscriptionPlan.objects.create(
			name="Basic",
			monthly_price=Decimal("199.00"),
			max_weight_per_month=Decimal("30.00"),
			description="",
		)

		# Setup location context so monthly order generator can create orders
		city = City.objects.create(name="TestCity", state="TS")
		self.branch = Branch.objects.create(
			city=city,
			branch_name="Main",
			address="Addr",
			latitude=Decimal("10.000000"),
			longitude=Decimal("76.000000"),
			is_active=True,
		)
		self.zone = ServiceZone.objects.create(
			branch=self.branch,
			zone_name="Z1",
			pincodes=["682001"],
		)
		CustomerAddress.objects.create(
			user=self.user,
			address_label="Home",
			full_address="Home",
			pincode="682001",
			latitude=Decimal("10.000000"),
			longitude=Decimal("76.000000"),
			is_default=True,
		)

		delivery_user = User.objects.create_user(
			email="staff@example.com",
			password="pass12345",
			full_name="Staff",
			phone="7777777777",
			role=User.Role.DELIVERY_STAFF,
			is_active=True,
			is_approved=True,
		)
		DeliveryStaff.objects.create(user=delivery_user, branch=self.branch, zone=self.zone, is_available=True)

	def test_overdue_monthly_payment_creates_fine_and_suspends_generation(self):
		today = timezone.localdate()
		sub = CustomerSubscription.objects.create(
			user=self.user,
			plan=self.plan,
			preferred_pickup_shift="morning",
			is_active=True,
			start_date=today,
			end_date=today + timedelta(days=30),
		)
		# Create an overdue pending payment
		p = Payment.objects.create(
			user=self.user,
			subscription=sub,
			order=None,
			amount=self.plan.monthly_price,
			payment_type="monthly",
			payment_status="pending",
			due_date=today - timedelta(days=2),
		)

		self.client.force_authenticate(user=self.user)
		res = self.client.get("/api/subscriptions/me/")
		self.assertEqual(res.status_code, 200)
		pending = res.data.get("pending_payment")
		self.assertIsNotNone(pending)
		self.assertTrue(pending.get("is_overdue"))
		self.assertEqual(pending.get("days_overdue"), 2)
		self.assertEqual(Decimal(str(pending.get("fine_amount"))), Decimal("20"))
		self.assertTrue(PaymentFine.objects.filter(payment=p).exists())

		# Generation should be suspended due to overdue pending monthly payment
		from orders.views import _ensure_monthly_orders_for_subscription
		created = _ensure_monthly_orders_for_subscription(sub, today, today)
		self.assertEqual(created, 0)
		self.assertFalse(Order.objects.filter(user=self.user, order_type="monthly", pickup_date=today).exists())

	def test_payment_clears_fine_and_creates_todays_order(self):
		today = timezone.localdate()
		sub = CustomerSubscription.objects.create(
			user=self.user,
			plan=self.plan,
			preferred_pickup_shift="morning",
			is_active=True,
			start_date=today,
			end_date=today + timedelta(days=30),
		)
		p = Payment.objects.create(
			user=self.user,
			subscription=sub,
			order=None,
			amount=self.plan.monthly_price,
			payment_type="monthly",
			payment_status="pending",
			due_date=today - timedelta(days=1),
		)
		PaymentFine.objects.create(payment=p, fine_amount=Decimal("10.00"), fine_days=1)

		self.client.force_authenticate(user=self.user)
		res = self.client.post("/api/subscriptions/pay/", {"payment_id": p.id}, format="json")
		self.assertEqual(res.status_code, 200)

		p.refresh_from_db()
		self.assertEqual(p.payment_status, "paid")
		self.assertFalse(PaymentFine.objects.filter(payment=p).exists())

		# Should resume service immediately by ensuring today's order exists
		self.assertTrue(Order.objects.filter(user=self.user, order_type="monthly", pickup_date=today).exists())
