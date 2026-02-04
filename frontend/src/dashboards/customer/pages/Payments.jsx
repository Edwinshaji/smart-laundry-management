import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiCreditCard, FiClock, FiCheckCircle, FiAlertCircle, FiPackage, FiTruck } from "react-icons/fi"; // CHANGED: add icons

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Payments = () => {
  const [rows, setRows] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState("");

  // load Razorpay script (Checkout modal)
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const existing = document.querySelector(
        "script[src='https://checkout.razorpay.com/v1/checkout.js']"
      );
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const describe403 = (e) => {
    const detail = e?.response?.data?.detail;
    const raw = typeof detail === "string" ? detail : "";
    if (/csrf/i.test(raw)) return "Forbidden (403): CSRF failed. Backend is using SessionAuthentication; Razorpay POST endpoints must be CSRF-exempt or you must send CSRF token.";
    return "Forbidden (403): not authenticated (session cookie not sent). Re-login using the same host as API.";
  };

  const fetchRows = () => {
    setError("");
    axios
      .get(`${API_BASE_URL}/api/customer/payments/`, { withCredentials: true })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((e) => {
        setRows([]);
        const code = e?.response?.status;
        if (code === 403) setError(describe403(e));
        else setError("Failed to load payments.");
      });
  };

  useEffect(() => {
    // Quick dev diagnostic: host mismatches often cause 403 (cookie not sent)
    try {
      const apiHost = API_BASE_URL ? new URL(API_BASE_URL).hostname : "";
      const pageHost = window.location.hostname;
      const hostPair = `${pageHost} -> ${apiHost || "(empty API host)"}`;
      if (
        apiHost &&
        ((pageHost === "localhost" && apiHost === "127.0.0.1") ||
          (pageHost === "127.0.0.1" && apiHost === "localhost"))
      ) {
        console.warn(
          `[Payments] Potential session-cookie host mismatch (${hostPair}). Use the same host everywhere (all localhost or all 127.0.0.1).`
        );
      }
      console.info("[Payments] API_BASE_URL =", API_BASE_URL);
    } catch {
      // ignore
    }

    fetchRows();
  }, []);

  const pending = useMemo(
    () => rows.filter((r) => String(r.payment_status).toLowerCase() === "pending"),
    [rows]
  );

  const paidRows = useMemo(
    () => rows.filter((r) => String(r.payment_status).toLowerCase() === "paid"),
    [rows]
  );

  const handlePayNow = async (paymentId) => {
    setError("");
    const p = rows.find((x) => x.id === paymentId);

    if (!canPay(p)) {
      setError("This order payment can be paid only after the order is delivered.");
      return;
    }

    const amount = p?.amount;
    if (amount == null || Number(amount) <= 0) {
      setError("Amount not calculated yet. Please wait until weight is recorded.");
      return;
    }

    setPayingId(paymentId);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        setError("Failed to load Razorpay checkout script.");
        return;
      }

      let data;
      try {
        const res = await axios.post(
          `${API_BASE_URL}/api/payments/create-order/`,
          { amount },
          { withCredentials: true }
        );
        data = res.data;
      } catch (e) {
        const code = e?.response?.status;
        if (code === 403) setError(describe403(e));
        else setError(e?.response?.data?.detail || "Failed to create Razorpay order.");
        return;
      }

      // IMPORTANT: do not fallback to VITE_RAZORPAY_KEY_ID here;
      // this is a sanity-check that backend dotenv/settings are loading.
      if (!data?.key) {
        setError("Backend did not return Razorpay key. Check backend .env loading (RAZORPAY_KEY_ID).");
        return;
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: "INR",
        order_id: data.order_id,
        name: "WashMate",
        description: "Laundry Payment",
        handler: async function (response) {
          try {
            await axios.post(`${API_BASE_URL}/api/payments/verify/`, response, {
              withCredentials: true,
            });
            await axios.post(
              `${API_BASE_URL}/api/customer/payments/pay/`,
              { payment_id: paymentId },
              { withCredentials: true }
            );
            fetchRows();
          } catch (e) {
            setError(e?.response?.data?.detail || "Payment verification/mark-paid failed.");
          }
        },
        theme: { color: "#6D28D9" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setError("Payment failed or was cancelled.");
      });
      rzp.open();
    } finally {
      setPayingId(null);
    }
  };

  const badge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "paid") return "bg-emerald-100 text-emerald-700";
    if (s === "failed") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const typeBadge = (t) => {
    const x = String(t || "").toLowerCase();
    return x === "monthly"
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";
  };

  const canPay = (p) => {
    // prefer backend truth; fallback to order_status if backend field missing
    if (typeof p?.is_payable === "boolean") return p.is_payable;
    const type = String(p?.payment_type || "").toLowerCase();
    const orderStatus = String(p?.order_status || "").toLowerCase();
    return type === "monthly" || orderStatus === "delivered";
  };

  return (
    <div className="space-y-6">

      {error ? (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <FiAlertCircle className="text-lg" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Something went wrong</div>
            <div className="text-red-700/90 mt-0.5">{error}</div>
          </div>
        </div>
      ) : null}

      {/* Pending Payments (Subscription-like container) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <FiCreditCard className="text-purple-600 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Payments</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {pending.length} pending • Pay demand orders after delivery • Subscriptions anytime
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                WashMate
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {pending.length === 0 ? (
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-white p-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-3">
                <FiCheckCircle className="text-2xl text-emerald-600" />
              </div>
              <div className="font-medium text-gray-800">No pending payments</div>
              <div className="text-sm text-gray-500 mt-1">
                You’re all caught up.
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((p) => {
                const payable = canPay(p);
                const hasAmount = p?.amount != null && Number(p.amount) > 0;
                const isMonthly = String(p?.payment_type || "").toLowerCase() === "monthly";

                return (
                  <div
                    key={p.id}
                    className="rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white"
                  >
                    <div
                      className={[
                        "p-4",
                        isMonthly
                          ? "bg-gradient-to-r from-purple-50 to-white"
                          : "bg-gradient-to-r from-blue-50 to-white",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${isMonthly ? "bg-purple-100" : "bg-blue-100"}`}>
                            {isMonthly ? (
                              <FiPackage className={`text-lg ${isMonthly ? "text-purple-700" : "text-blue-700"}`} />
                            ) : (
                              <FiTruck className="text-lg text-blue-700" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge(p.payment_type)}`}>
                              {isMonthly ? "Subscription" : "On-demand"}
                            </div>

                            {p.plan_name ? (
                              <div className="mt-2 text-sm text-gray-700 font-medium truncate">
                                {p.plan_name}
                              </div>
                            ) : null}

                            {p.order_id ? (
                              <div className="mt-1 text-xs text-gray-500">
                                Order #{p.order_id}
                                {p.weight_kg ? <span className="ml-1">• {p.weight_kg} kg</span> : null}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge(p.payment_status)}`}>
                          {p.payment_status}
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            {p.amount == null || Number(p.amount) <= 0 ? (
                              <span className="text-gray-400 text-base font-semibold">TBD</span>
                            ) : (
                              `₹${Number(p.amount).toLocaleString()}`
                            )}
                          </div>

                          {p.due_date ? (
                            <div className="mt-1 text-sm text-gray-600 flex items-center gap-1">
                              <FiClock className="text-xs text-gray-400" />
                              Due: <span className="font-medium text-gray-700">{p.due_date}</span>
                            </div>
                          ) : (
                            <div className="mt-1 text-sm text-gray-400 italic">
                              Due after delivery
                            </div>
                          )}

                          {(p.fine_amount > 0 || p.fine_days > 0) ? (
                            <div className="mt-2 inline-flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-full px-3 py-1">
                              <span className="font-medium">
                                Fine ₹{Number(p.fine_amount || 0).toLocaleString()}
                              </span>
                              <span className="text-red-700/80">• {p.fine_days} days</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="text-xs text-gray-400">ID: {p.id}</div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        className={[
                          "w-full px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50",
                          payable && hasAmount
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                            : "bg-gray-300 cursor-not-allowed",
                        ].join(" ")}
                        onClick={() => handlePayNow(p.id)}
                        disabled={!payable || !hasAmount || payingId === p.id}
                        title={!payable ? "Pay available after delivery" : !hasAmount ? "Amount not calculated yet" : "Pay now"}
                      >
                        {payingId === p.id
                          ? "Processing..."
                          : payable && hasAmount
                            ? `Pay ₹${Number(p.amount + (p.fine_amount || 0)).toLocaleString()}`
                            : "Pay after delivery"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment History (Subscription-like container) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-100">
              <FiCheckCircle className="text-emerald-600 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {paidRows.length} completed payment{paidRows.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                  <th className="py-3 px-4 font-medium">Weight</th>
                  <th className="py-3 px-4 font-medium">Amount</th>
                  <th className="py-3 px-4 font-medium">Fine</th>
                  <th className="py-3 px-4 font-medium">Paid</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-gray-700">
                {paidRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge(r.payment_type)}`}>
                        {String(r.payment_type).toLowerCase() === "monthly" ? "Subscription" : "On-demand"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {r.plan_name ? <span>Plan: {r.plan_name}</span> : null}
                      {r.order_id ? <span>{r.plan_name ? " • " : ""}Order #{r.order_id}</span> : null}
                    </td>
                    <td className="py-3 px-4">{r.weight_kg ? `${r.weight_kg} kg` : "-"}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {r.amount == null || Number(r.amount) <= 0 ? "-" : `₹${Number(r.amount).toLocaleString()}`}
                    </td>
                    <td className="py-3 px-4">
                      {r.fine_amount > 0 ? (
                        <span className="text-red-600">₹{Number(r.fine_amount).toLocaleString()}</span>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{r.payment_date || "-"}</td>
                  </tr>
                ))}

                {paidRows.length === 0 && (
                  <tr>
                    <td className="py-8 px-4 text-gray-400 text-center" colSpan={6}>
                      No payment history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* subtle footer like Subscription page */}
          <div className="mt-4 text-xs text-gray-400">
            Showing latest {paidRows.length} completed payments.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
