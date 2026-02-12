====================================================================
SMART LAUNDRY MANAGEMENT SYSTEM
====================================================================

1. PROJECT OVERVIEW
--------------------------------------------------------------------
The Smart Laundry Management System is a full-stack, web-based platform
designed to automate and manage end-to-end laundry operations for a
centralized laundry brand operating across multiple cities and branches.

The system connects customers, delivery staff, branch managers, and a
super administrator through a single digital platform, replacing
manual coordination and improving efficiency, transparency, and
customer satisfaction.

The platform supports both monthly subscription-based services and
demand-based (on-request) laundry services with automated pickup
scheduling, weight tracking, billing, fines, and analytics.

--------------------------------------------------------------------
2. OBJECTIVES
--------------------------------------------------------------------
- Centralize laundry service operations across multiple cities
- Automate pickup, washing, and delivery workflows
- Support monthly and demand-based service models
- Implement role-based access control
- Provide real-time order tracking
- Enable flexible billing and fine management
- Improve operational efficiency and customer experience
- Deliver a mobile-first, responsive user interface

--------------------------------------------------------------------
3. USER ROLES
--------------------------------------------------------------------
The system supports four user roles, all stored in a single user table:

1. Customer
2. Delivery Staff
3. Branch Manager
4. Super Admin

Each role has a dedicated dashboard with controlled permissions.

--------------------------------------------------------------------
4. AUTHENTICATION & AUTHORIZATION (UPDATED)
--------------------------------------------------------------------

The WashMate system uses session-based authentication with strict
role-based access control. All users are stored in a single user table
and differentiated using a role field.

Authentication is handled by the backend, which determines access
permissions, approval status, and dashboard routing.

Passwords are securely hashed and never stored in plain text.

--------------------------------------------------------------------
4.1 USER REGISTRATION & APPROVAL FLOW
--------------------------------------------------------------------

The system supports controlled self-registration for selected roles,
with approval workflows where required.

-------------------------
Customer
-------------------------
- Customers can self-register.
- No approval is required.
- Customers can log in immediately after registration.

-------------------------
Branch Manager
-------------------------
- Branch managers self-register.
- They must select an existing branch created by the Super Admin.
- Branch manager accounts are created in an unapproved state.
- Super Admin must approve the branch manager before login access is granted.
- Until approval, login attempts will show an “Awaiting Admin Approval” message.

-------------------------
Delivery Staff (UPDATED)
-------------------------
- Delivery staff can self-register.
- During registration, delivery staff select the branch they wish to work under.
- Delivery staff accounts are created with approval pending.
- The respective Branch Manager must approve delivery staff accounts.
- Only approved delivery staff can access the delivery dashboard.
- Unapproved delivery staff will see an “Awaiting Branch Manager Approval” message on login.

-------------------------
Super Admin
-------------------------
- Super Admin accounts are created manually via backend or CLI.
- No registration page is provided for Super Admin.

--------------------------------------------------------------------
4.2 ROLE RESPONSIBILITY SUMMARY
--------------------------------------------------------------------

| Role            | Can Register | Approval Required | Approved By        |
|-----------------|-------------|-------------------|--------------------|
| Customer        | Yes         | No                | Not Applicable     |
| Branch Manager  | Yes         | Yes               | Super Admin        |
| Delivery Staff  | Yes         | Yes               | Branch Manager     |
| Super Admin     | No          | No                | Not Applicable     |

--------------------------------------------------------------------
4.3 LOGIN ACCESS RULES
--------------------------------------------------------------------

- Users can log in only if:
  - Account is active
  - Approval status is true (if approval is required)

- Login attempts for unapproved users are blocked with a clear message.

- Role-based redirection ensures users are routed only to their
  respective dashboards.

--------------------------------------------------------------------
4.4 SECURITY & DATA INTEGRITY
--------------------------------------------------------------------

- Approval logic prevents unauthorized access.
- Deactivated users cannot log in.
- Branch data remains intact even when managers or staff change.
- Historical records are preserved for auditing and analytics.

--------------------------------------------------------------------
END OF AUTHENTICATION & AUTHORIZATION
--------------------------------------------------------------------

--------------------------------------------------------------------
5. SERVICE TYPES & WORKFLOWS
--------------------------------------------------------------------

5.1 MONTHLY SUBSCRIPTION SERVICE
--------------------------------
- Customer subscribes to a monthly plan
- Preferred pickup shift (morning/evening) selected at subscription time
- Pickup orders are generated automatically
- Weight is entered daily by delivery staff
- Billing is fixed monthly (not per order)
- Customer can mark “No Pickup Today”
- Payment window: 1st to 4th of every month
- After 4th, service is suspended until payment is made

5.2 DEMAND-BASED SERVICE
------------------------
- Customer places an order manually
- Pickup shift selected per order
- Shift rules:
  • Before 8 AM → same-day morning pickup
  • 8 AM – 6 PM → same-day evening pickup
  • After 6 PM → next-day morning pickup
- Weight recorded at pickup
- Payment due within 1 day after delivery
- Fine: ₹10 per day until payment is completed

--------------------------------------------------------------------
6. DELIVERY STAFF WORKFLOW (UPDATED)
--------------------------------------------------------------------
Delivery dashboard is separated into pages (separate React components):

- Pickup Pending
  - Shows Today’s pickups and Upcoming pickups (date-based grouping)
  - Sorting by pickup_date available

- Reached Branch
  - Orders moved here after Picked Up
  - Per-order “Reached” + bulk select-and-mark

- Out for Delivery
  - Date-priority grouping:
    • Deliver Today
    • Overdue
    • Deliver Later
  - Sorting by delivery date available

- History
  - Delivered orders list

Notes:
- Demand vs Subscription are shown as two lanes/tabs, but share the same status model.
- UI shows serial numbers per section/day instead of DB order IDs.

Implementation note:
- Status tracking remains:
  scheduled → picked_up → reached_branch → washing → ready_for_delivery → delivered
- Demand and Monthly are displayed separately but share the same status model.

Delivery staff also has a Profile page:
- View assigned Branch + Service Zone
- Edit name/contact details
- Change password
- View availability status

--------------------------------------------------------------------
7. CUSTOMER DASHBOARD FEATURES
--------------------------------------------------------------------
- View monthly subscription details
- View monthly usage summary (days used, total weight)
- Place demand-based orders
- Track order status
- View payment history
- View fines and pending payments
- Mark “No Pickup Today”

Monthly plans show summaries instead of detailed daily orders
to maintain a clean user experience.

--------------------------------------------------------------------
8. BRANCH MANAGER DASHBOARD FEATURES
--------------------------------------------------------------------
- Add and manage delivery staff
- Assign service zones
- View and manage all branch orders
- Track unpaid customers
- Contact customers with pending dues
- View branch analytics:
  • Total customers
  • Monthly plan revenue
  • Demand-based revenue
  • Total orders
- Update branch details and location
- Suspend or activate staff accounts

--------------------------------------------------------------------
9. SUPER ADMIN DASHBOARD FEATURES
--------------------------------------------------------------------
- Add and manage cities
- Add and manage branches
- Approve branch managers
- View system-wide analytics
- Compare branch performance
- Monitor total revenue
- View and manage all users
- Suspend or activate branches

--------------------------------------------------------------------
10. FRONTEND ARCHITECTURE
--------------------------------------------------------------------
  React (Functional Components)
- Vite (Fast development and build tool)
- React Router DOM (Client-side routing)
- Tailwind CSS (Utility-first styling)
- Axios (HTTP client for API communication)
- React Context API (Global authentication state)
- Leaflet + React-Leaflet (Maps and location display)

Frontend Routes:
- /customer/login
- /customer/register
- /staff/login
- /branch/register
- /customer
- /delivery
- /branch
- /admin

API Routes (key ones)
- Customer subscriptions:
  - GET  /api/subscriptions/plans/
  - GET  /api/subscriptions/me/
  - POST /api/subscriptions/subscribe/
  - POST /api/subscriptions/cancel/
- Customer payments:
  - GET  /api/customer/payments/
  - POST /api/customer/payments/pay/
- Razorpay:
  - POST /api/payments/create-order/
  - POST /api/payments/verify/

--------------------------------------------------------------------
11. BACKEND ARCHITECTURE
--------------------------------------------------------------------
- Python Django
- Django REST Framework
- Modular app structure:
  • accounts
  • branches
  • subscriptions
  • orders
  • payments
  • analytics
- No Django templates used
- REST API only
- MySQL database using PyMySQL

--------------------------------------------------------------------
12. DATABASE DESIGN (NORMALIZED & SCALABLE)
--------------------------------------------------------------------

12.1 users
----------
Purpose: Stores all system users.

Fields:
- id (PK, INT, AUTO_INCREMENT)
- full_name (VARCHAR, NOT NULL)
- email (VARCHAR, UNIQUE, NOT NULL)
- phone (VARCHAR, UNIQUE, NOT NULL)
- password_hash (VARCHAR, NOT NULL)
- role (ENUM: customer, delivery_staff, branch_manager, super_admin)
- is_active (BOOLEAN, DEFAULT TRUE)
- is_approved (BOOLEAN, DEFAULT FALSE)
- created_at (DATETIME)
- updated_at (DATETIME)

--------------------------------------------------------------------
12.2 cities
-----------
Fields:
- id (PK)
- name (VARCHAR, NOT NULL)
- state (VARCHAR, NOT NULL)

Constraint:
- UNIQUE(name, state)

--------------------------------------------------------------------
12.3 branches
-------------
Fields:
- id (PK)
- city_id (FK → cities.id)
- branch_name (VARCHAR, NOT NULL)
- address (TEXT, NOT NULL)
- latitude (DECIMAL, NOT NULL)
- longitude (DECIMAL, NOT NULL)
- is_active (BOOLEAN)
- created_at (DATETIME)

--------------------------------------------------------------------
12.4 branch_managers
--------------------
Fields:
- id (PK)
- user_id (FK → users.id, UNIQUE)
- branch_id (FK → branches.id)

--------------------------------------------------------------------
12.5 service_zones
------------------
Fields:
- id (PK)
- branch_id (FK → branches.id)
- zone_name (VARCHAR)
- pincodes (JSON array of strings)  # Example: ["682001", "682002", "682003"]

--------------------------------------------------------------------
12.6 delivery_staff
-------------------
Fields:
- id (PK)
- user_id (FK → users.id, UNIQUE)
- branch_id (FK → branches.id)
- zone_id (FK → service_zones.id)
- is_available (BOOLEAN)

--------------------------------------------------------------------
12.7 subscription_plans
-----------------------
Fields:
- id (PK)
- name (VARCHAR)
- monthly_price (DECIMAL)
- max_weight_per_month (DECIMAL)
- description (TEXT)

--------------------------------------------------------------------
12.8 customer_subscriptions
---------------------------
Fields:
- id (PK)
- user_id (FK → users.id)
- plan_id (FK → subscription_plans.id)
- preferred_pickup_shift (ENUM: morning, evening)
- is_active (BOOLEAN)
- start_date (DATE)
- end_date (DATE)

--------------------------------------------------------------------
12.9 subscription_skip_days
---------------------------
Fields:
- id (PK)
- subscription_id (FK → customer_subscriptions.id)
- skip_date (DATE)
- reason (VARCHAR)

Constraint:
- UNIQUE(subscription_id, skip_date)

--------------------------------------------------------------------
12.10 orders
------------
Fields:
- id (PK)
- user_id (FK → users.id)
- branch_id (FK → branches.id)
- delivery_staff_id (FK → delivery_staff.id)
- order_type (ENUM: monthly, demand)
- pickup_shift (ENUM: morning, evening)
- pickup_date (DATE)
- status (ENUM:
  scheduled, picked_up, reached_branch,
  washing, ready_for_delivery, delivered, cancelled)
- created_at (DATETIME)

--------------------------------------------------------------------
12.11 order_weights
-------------------
Fields:
- id (PK)
- order_id (FK → orders.id, UNIQUE)
- weight_kg (DECIMAL)
- recorded_by_staff_id (FK → users.id)
- recorded_at (DATETIME)

--------------------------------------------------------------------
12.12 order_status_logs
-----------------------
Fields:
- id (PK)
- order_id (FK → orders.id)
- status (VARCHAR)
- changed_by (FK → users.id)
- changed_at (DATETIME)

--------------------------------------------------------------------
12.13 payments
--------------
Fields:
- id (PK)
- user_id (FK → users.id)
- order_id (FK → orders.id, NULL)
- subscription_id (FK → customer_subscriptions.id, NULL)
- amount (DECIMAL)
- payment_type (ENUM: monthly, demand)
- payment_status (ENUM: pending, paid, failed)
- payment_date (DATETIME)

--------------------------------------------------------------------
12.14 payment_fines
-------------------
Fields:
- id (PK)
- payment_id (FK → payments.id)
- fine_amount (DECIMAL)
- fine_days (INT)
- calculated_at (DATETIME)

--------------------------------------------------------------------
12.15 branch_daily_stats
------------------------
Fields:
- id (PK)
- branch_id (FK → branches.id)
- date (DATE)
- total_orders (INT)
- total_weight (DECIMAL)
- total_revenue (DECIMAL)

Constraint:
- UNIQUE(branch_id, date)

--------------------------------------------------------------------
12.16 user_monthly_usage
------------------------
Fields:
- id (PK)
- user_id (FK → users.id)
- month (YYYY-MM)
- total_weight (DECIMAL)
- total_pickups (INT)

Constraint:
- UNIQUE(user_id, month)

--------------------------------------------------------------------
13. KEY DESIGN PRINCIPLES
--------------------------------------------------------------------
- Single user table with role-based access
- Normalized database schema (3NF)
- Strong referential integrity
- Clear separation of concerns
- Mobile-first UI design
- Scalable multi-branch architecture
- Audit-friendly workflow tracking

--------------------------------------------------------------------
END OF DOCUMENT
--------------------------------------------------------------------

--------------------------------------------------------------------
14. PAYMENT SYSTEM
--------------------------------------------------------------------

14.1 SUBSCRIPTION (MONTHLY) PAYMENTS
------------------------------------
- Payment is auto-generated when customer subscribes to a plan
- Subscription is valid for 30 days from subscription date
- First payment due within 4 days of subscription
- When payment is made, subscription extends by 30 days
- Next payment is auto-generated with due date at end of new period
- Rolling 30-day billing cycle (not calendar month based)

Example:
- Customer subscribes on Jan 15
- First payment due by Jan 19 (4-day grace)
- Subscription valid until Feb 14
- When first payment made, subscription extends to Mar 16
- Next payment due on Feb 14

14.2 DEMAND-BASED ORDER PAYMENTS
--------------------------------
- Payment is auto-generated when customer places an order
- Initial amount = ₹100 (minimum charge)
- Amount is recalculated when weight is recorded at pickup:
  Amount = max(weight_kg × ₹50, ₹100)
- Due date is set when order is delivered (1 day after delivery)
- Customer can pay only after order is delivered
- Fine: ₹10 per day after due date

14.3 SCHEDULED TASKS (CRON)
---------------------------
Run daily to calculate fines for overdue payments:

# Calculate fines for overdue payments (run daily)
0 1 * * * cd /path/to/backend && python manage.py calculate_fines

# Generate subscription (monthly) pickup orders at 12:00 AM (recommended)
# NOTE: This works even if your app server was down at midnight.
0 0 * * * cd /path/to/backend && python manage.py generate_monthly_orders

Notes:
- Default behavior is to generate subscription pickup orders for **today only**.
- If you want to pre-generate future days, run:
  `python manage.py generate_monthly_orders --days-ahead 1` (or set MONTHLY_ORDER_GENERATE_DAYS_AHEAD accordingly).
- The backend also has an in-process "midnight" generator thread (dev-friendly),
  but it only runs if the server process is up at 12:00 AM.
- To handle downtime, the server performs a startup catch-up: when it starts,
  it checks whether today's subscription pickup orders exist and creates missing ones.
- Generation respects:
  • subscription active + start/end dates
  • skip-days (no-pickup)
  • branch/address availability
  • suspended subscriptions when monthly payment is overdue

14.4 RAZORPAY INTEGRATION
-------------------------
- POST /api/payments/create-order/ - Create Razorpay order
- POST /api/payments/verify/ - Verify payment signature
- POST /api/customer/payments/pay/ - Mark payment as paid in DB
