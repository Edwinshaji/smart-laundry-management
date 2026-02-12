import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiCheck, FiCalendar, FiPackage, FiCreditCard, FiAlertCircle, FiClock, FiX } from "react-icons/fi";

// NEW: make Axios compatible with Django SessionAuthentication CSRF
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";

// NEW: local-day key (avoids UTC date shifts)
const todayLocalISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const NO_PICKUP_LS_KEY = "customer_no_pickup_marked_date";

const Subscription = () => {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ total_pickups: 0, total_weight: 0 });
  const [pendingPayment, setPendingPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedShift, setSelectedShift] = useState("morning");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // NEW: today’s subscription order status (from /api/customer/overview/)
  const [todaySubscriptionOrder, setTodaySubscriptionOrder] = useState(null);

  // NEW: no-pickup action state
  const [skipping, setSkipping] = useState(false);
  const [skipDone, setSkipDone] = useState(false);

  // NEW: hydrate skipDone for the whole day (survives refresh)
  useEffect(() => {
    try {
      const markedDate = localStorage.getItem(NO_PICKUP_LS_KEY);
      setSkipDone(markedDate === todayLocalISO());
    } catch {
      // ignore
    }
  }, []);

  // NEW: missing helper (was referenced but not defined)
  const statusPill = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return "bg-emerald-100 text-emerald-700";
    if (s === "scheduled") return "bg-blue-100 text-blue-700";
    if (s === "picked_up") return "bg-amber-100 text-amber-700";
    if (s === "washing" || s === "reached_branch") return "bg-purple-100 text-purple-700";
    if (s === "ready_for_delivery") return "bg-indigo-100 text-indigo-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const tryGet = async (urls) => {
    for (const url of urls) {
      try {
        // withCredentials is already defaulted in src/main.jsx, but keep explicit
        return await axios.get(url, { withCredentials: true });
      } catch {
        // try next
      }
    }
    throw new Error("all_get_failed");
  };

  const tryPost = async (urls, body) => {
    for (const url of urls) {
      try {
        return await axios.post(url, body, { withCredentials: true });
      } catch {
        // try next
      }
    }
    throw new Error("all_post_failed");
  };

  const fetchPlans = async () => {
    setError("");
    try {
      const res = await tryGet([
        "/api/subscriptions/plans/",
        "/api/manager/subscriptions/plans/", // fallback alias
        "/api/admin/plans/",                 // existing working admin list
        "/api/subscriptions/admin/plans/",
      ]);
      const rows = Array.isArray(res.data) ? res.data : res.data?.plans;
      setPlans(Array.isArray(rows) ? rows : []);
      if (!Array.isArray(rows)) setError("Plans API returned unexpected response.");
    } catch {
      setPlans([]);
      setError("Unable to load subscription plans (check backend routes).");
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await tryGet([
        "/api/subscriptions/me/",
        "/api/manager/subscriptions/me/", // fallback alias
      ]);
      setSubscription(res.data.subscription);
      setUsage(res.data.usage);
      setPendingPayment(res.data.pending_payment);
    } catch {
      setSubscription(null);
      setUsage({ total_pickups: 0, total_weight: 0 });
      setPendingPayment(null);
    }
  };

  const fetchTodaySubscriptionOrder = async () => {
    try {
      const res = await tryGet([
        "/api/customer/overview/",
        "/api/orders/customer/overview/", // optional fallback if you have an alias
      ]);
      setTodaySubscriptionOrder(res?.data?.todaySubscriptionOrder || null);
    } catch {
      setTodaySubscriptionOrder(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchPlans(), fetchSubscription(), fetchTodaySubscriptionOrder()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError("Please select a plan");
      return;
    }

    setSubscribing(true);
    setError("");
    setSuccess("");

    try {
      await tryPost(
        [
          "/api/subscriptions/subscribe/",
          "/api/manager/subscriptions/subscribe/", // fallback alias
        ],
        { plan_id: selectedPlan, preferred_pickup_shift: selectedShift }
      );
      setSuccess("Subscription created successfully!");
      setSelectedPlan(null);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to subscribe (route missing?)");
    } finally {
      setSubscribing(false);
    }
  };

  const handlePayment = async () => {
    if (!pendingPayment) return;

    setPaying(true);
    setError("");
    setSuccess("");

    try {
      await tryPost(
        ["/api/subscriptions/pay/", "/api/manager/subscriptions/pay/"],
        { payment_id: pendingPayment.id }
      );
      setSuccess("Payment successful!");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) return;

    setError("");
    setSuccess("");

    try {
      await tryPost(
        ["/api/subscriptions/cancel/", "/api/manager/subscriptions/cancel/"],
        {}
      );
      setSuccess("Subscription cancelled");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to cancel subscription");
    }
  };

  const handleGoToPayments = () => {
    try {
      localStorage.setItem("customer_active_tab", "payments");
      window.dispatchEvent(new CustomEvent("customer:navigate", { detail: { tab: "payments" } }));
      return;
    } catch {
      // ignore
    }
    // fallback (only if something goes wrong)
    window.location.assign("/dashboards/customer");
  };

  const handleNoPickupToday = async () => {
    // NEW: block early with a clear message (toast-like via banner)
    const status = String(todaySubscriptionOrder?.status || "").toLowerCase();
    if (skipDone) {
      setError("Already marked “No Pickup Today” for today.");
      return;
    }
    if (todaySubscriptionOrder && status !== "scheduled") {
      setError(`Too late to skip: today's pickup is already '${status.replace(/_/g, " ")}'`);
      return;
    }

    if (!window.confirm("Mark 'No Pickup Today' for your subscription pickup?")) return;

    setSkipping(true);
    setError("");
    setSuccess("");

    try {
      const endpoints = [
        "/api/customer/subscription/no-pickup-today/",
        "/api/subscriptions/no-pickup-today/",
      ];

      let ok = false;
      let lastErr = null;

      for (const url of endpoints) {
        try {
          await axios.post(url, { reason: "No Pickup Today" }, { withCredentials: true });
          ok = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!ok) {
        const detail = lastErr?.response?.data?.detail;
        throw new Error(typeof detail === "string" ? detail : "No skip endpoint found");
      }

      // NEW: persist for the full day
      try {
        localStorage.setItem(NO_PICKUP_LS_KEY, todayLocalISO());
      } catch {
        // ignore
      }

      setSkipDone(true);
      setSuccess("No pickup marked for today.");
      await loadData(); // refresh today card (may become cancelled)
    } catch (e) {
      setError(e?.message || "Failed to mark no pickup today. Ensure backend route exists.");
    } finally {
      setSkipping(false);
    }
  };

  const renderPlansGrid = ({ selectable }) => (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {selectable ? "Choose a Subscription Plan" : "All Plans"}
          </h3>
          {!selectable && (
            <p className="text-sm text-gray-500 mt-1">
              Your current plan is highlighted. To switch plans, cancel the current subscription first.
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = Boolean(subscription?.plan_id) && subscription.plan_id === plan.id;
          const isSelected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => {
                if (!selectable) return;
                setSelectedPlan(plan.id);
              }}
              className={[
                "bg-white rounded-xl p-6 transition-all",
                selectable ? "cursor-pointer hover:shadow-lg" : "cursor-default",
                isCurrent ? "ring-2 ring-emerald-400 shadow-md" : "shadow-sm hover:shadow-md",
                selectable && isSelected ? "ring-2 ring-purple-500 shadow-md" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">{plan.name}</h4>

                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Current
                    </span>
                  )}
                  {selectable && isSelected && (
                    <div className="p-1 bg-purple-500 rounded-full">
                      <FiCheck className="text-white text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-800">₹{plan.monthly_price}</span>
                <span className="text-gray-500">/month</span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FiCheck className="text-green-500" />
                  <span>Up to {plan.max_weight_per_month} kg/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheck className="text-green-500" />
                  <span>Daily pickup available</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheck className="text-green-500" />
                  <span>Free delivery</span>
                </div>
              </div>

              {plan.description && (
                <p className="mt-4 text-xs text-gray-500">{plan.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-500">No subscription plans available at the moment.</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (subscription) {
    // NEW: compute UI state for the button
    const todayStatus = String(todaySubscriptionOrder?.status || "").toLowerCase();
    const canSkipToday = Boolean(todaySubscriptionOrder) && todayStatus === "scheduled" && !skipDone && !skipping;

    const skipBlockReason =
      skipDone
        ? "Already marked for today."
        : todaySubscriptionOrder && todayStatus !== "scheduled"
          ? `Already '${todayStatus.replace(/_/g, " ")}'`
          : "Not available.";

    return (
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* NEW: Today’s subscription pickup card + No Pickup button */}
        {todaySubscriptionOrder && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <FiClock className="text-indigo-600 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Today’s Subscription Pickup</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {todaySubscriptionOrder.pickup_date} •{" "}
                    <span className="capitalize">{todaySubscriptionOrder.pickup_shift}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusPill(todaySubscriptionOrder.status)}`}>
                  {String(todaySubscriptionOrder.status || "").replace(/_/g, " ")}
                </span>

                <button
                  onClick={() => {
                    if (!canSkipToday) {
                      setError(skipBlockReason);
                      return;
                    }
                    handleNoPickupToday();
                  }}
                  disabled={skipping} // keep real disable only while request is in-flight
                  aria-disabled={!canSkipToday}
                  className={[
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                    canSkipToday
                      ? "bg-gray-100 hover:bg-gray-200"
                      : "bg-gray-100 opacity-50 cursor-not-allowed",
                  ].join(" ")}
                  title="Skip today’s pickup (only if still scheduled)"
                >
                  <FiX />
                  {skipDone ? "Marked" : skipping ? "Marking..." : "No Pickup"}
                </button>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400">Order ID: {todaySubscriptionOrder.id}</div>
          </div>
        )}

        {/* Pending Payment Alert */}
        {pendingPayment && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-yellow-600 text-xl mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">Payment Pending</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Amount: ₹{pendingPayment.amount} | Due: {pendingPayment.due_date}
                </p>
                <button
                  onClick={handleGoToPayments}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
                >
                  Go to Payments
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <FiPackage className="text-purple-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{subscription.plan}</h3>
              <p className="text-sm text-gray-500">Active Plan</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Monthly Price</p>
              <p className="text-lg font-semibold text-gray-800">₹{subscription.monthly_price}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Weight Limit</p>
              <p className="text-lg font-semibold text-gray-800">{subscription.max_weight_per_month} kg</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Pickup Shift</p>
              <p className="text-lg font-semibold text-gray-800 capitalize">{subscription.preferred_pickup_shift}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase">Valid Until</p>
              <p className="text-lg font-semibold text-gray-800">{subscription.end_date}</p>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-700 mb-4">This Month's Usage</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 uppercase">Total Pickups</p>
                <p className="text-2xl font-bold text-blue-700">{usage.total_pickups}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 uppercase">Total Weight</p>
                <p className="text-2xl font-bold text-green-700">{usage.total_weight} kg</p>
                <p className="text-xs text-green-600 mt-1">
                  of {subscription.max_weight_per_month} kg limit
                </p>
              </div>
            </div>
          </div>

          {/* Cancel Button */}
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm"
            >
              Cancel Subscription
            </button>
          </div>
        </div>

        {/* NEW: show all plans under my subscription */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {renderPlansGrid({ selectable: false })}
        </div>
      </div>
    );
  }

  // No subscription - show plans to choose from
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* CHANGED: reuse the grid renderer for selectable mode */}
      {renderPlansGrid({ selectable: true })}

      {/* Subscription Form */}
      {selectedPlan && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Complete Your Subscription</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Pickup Shift
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shift"
                  value="morning"
                  checked={selectedShift === "morning"}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="text-purple-600"
                />
                <span>Morning (6 AM - 12 PM)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="shift"
                  value="evening"
                  checked={selectedShift === "evening"}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="text-purple-600"
                />
                <span>Evening (4 PM - 8 PM)</span>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiCalendar />
              <span>Subscription starts today</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <FiCreditCard />
              <span>Payment due within 4 days of subscription</span>
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {subscribing ? "Processing..." : "Subscribe Now"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Subscription;
