import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiPackage, FiPlus, FiCalendar, FiClock, FiMapPin, FiTruck, FiTrash2, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // NEW: no-pickup action state
  const [skipping, setSkipping] = useState(false);
  const [skipDone, setSkipDone] = useState(false);

  const [form, setForm] = useState({
    address_id: "",
    branch_id: "",
    pickup_date: "",
    pickup_shift: "morning",
  });

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/orders/`, { withCredentials: true });
      const rows = Array.isArray(res.data) ? res.data : [];

      // on-demand only (defensive)
      const demandOnly = rows.filter((r) => String(r?.order_type || "").toLowerCase() === "demand");
      demandOnly.sort((a, b) => (b?.id || 0) - (a?.id || 0));
      setOrders(demandOnly);
    } catch {
      setOrders([]);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/addresses/`, { withCredentials: true });
      setAddresses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAddresses([]);
    }
  };

  const fetchBranches = async (addressId) => {
    if (!addressId) {
      setBranches([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/available-branches/?address_id=${addressId}`, { withCredentials: true });
      const data = Array.isArray(res.data) ? res.data : [];
      setBranches(data);

      // Auto-select first branch if only one available
      if (data.length === 1) {
        setForm((prev) => ({ ...prev, branch_id: String(data[0].id) }));
      } else if (data.length > 0 && !form.branch_id) {
        setForm((prev) => ({ ...prev, branch_id: String(data[0].id) }));
      }
    } catch {
      setBranches([]);
    }
  };

  // NEW: today subscription order status (used by No Pickup Today gating)
  const [todaySubscriptionOrder, setTodaySubscriptionOrder] = useState(null);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchAddresses(), fetchTodaySubscriptionOrder()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (form.address_id) {
      fetchBranches(form.address_id);
    } else {
      setBranches([]);
      setForm(prev => ({ ...prev, branch_id: "" }));
    }
  }, [form.address_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address_id || !form.pickup_date || !form.pickup_shift) {
      setError("Please fill all required fields");
      return;
    }
    if (branches.length > 0 && !form.branch_id) {
      setError("Please select a branch");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await axios.post(`${API_BASE_URL}/api/customer/orders/`, form, { withCredentials: true });
      setSuccess("Order placed successfully! Payment will be due after delivery.");
      setShowForm(false);
      setForm({ address_id: "", branch_id: "", pickup_date: "", pickup_shift: "morning" });
      setBranches([]);
      await fetchOrders();
      setPage(1); // NEW: jump to first page where new order appears
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/customer/orders/${id}/`, { withCredentials: true });
      await fetchOrders();
      setSuccess("Order cancelled");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to cancel order");
    }
  };

  const getStatusStyle = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return "bg-emerald-100 text-emerald-700";
    if (s === "scheduled") return "bg-blue-100 text-blue-700";
    if (s === "picked_up") return "bg-amber-100 text-amber-700";
    if (s === "washing" || s === "reached_branch") return "bg-purple-100 text-purple-700";
    if (s === "ready_for_delivery") return "bg-indigo-100 text-indigo-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return <FiCheck />;
    if (s === "scheduled") return <FiClock />;
    if (s === "picked_up" || s === "ready_for_delivery") return <FiTruck />;
    return <FiPackage />;
  };

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = useMemo(() => Math.max(1, Math.ceil((orders?.length || 0) / pageSize)), [orders, pageSize]);
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const pagedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, safePage, pageSize]);

  const showingFrom = orders.length ? (safePage - 1) * pageSize + 1 : 0;
  const showingTo = Math.min(safePage * pageSize, orders.length);

  const pageButtons = useMemo(() => {
    // small pager: 1 ... (p-1) p (p+1) ... last
    const last = totalPages;
    const p = safePage;
    const set = new Set([1, last, p - 1, p, p + 1].filter((n) => n >= 1 && n <= last));
    return Array.from(set).sort((a, b) => a - b);
  }, [safePage, totalPages]);

  const handleNoPickupToday = async () => {
    // NEW: block early with reason (toast-like via banners)
    const status = String(todaySubscriptionOrder?.status || "").toLowerCase();
    if (skipDone) {
      setError("Already marked “No Pickup Today” for today.");
      return;
    }
    if (todaySubscriptionOrder && status !== "scheduled") {
      setError(`Too late to skip: today's pickup is already '${status.replace(/_/g, " ")}'.`);
      return;
    }

    if (!window.confirm("Mark 'No Pickup Today' for your subscription pickup?")) return;

    setError("");
    setSuccess("");
    setSkipping(true);

    try {
      const endpoints = [
        `${API_BASE_URL}/api/customer/subscription/no-pickup-today/`,
        `${API_BASE_URL}/api/subscriptions/no-pickup-today/`, // optional alias
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
      setSuccess("No pickup marked for today (subscription).");
      setTimeout(() => setSuccess(""), 4000);

      // NEW: refresh overview status (so UI stays consistent)
      await fetchTodaySubscriptionOrder();
    } catch (e) {
      setError(e?.message || "Failed to mark no pickup today. Ensure backend route exists.");
    } finally {
      setSkipping(false);
    }
  };

  // NEW: hydrate skipDone for the whole day (survives refresh)
  useEffect(() => {
    try {
      const markedDate = localStorage.getItem(NO_PICKUP_LS_KEY);
      setSkipDone(markedDate === todayLocalISO());
    } catch {
      // ignore
    }
  }, []);

  const fetchTodaySubscriptionOrder = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/overview/`, { withCredentials: true });
      setTodaySubscriptionOrder(res?.data?.todaySubscriptionOrder || null);
    } catch {
      setTodaySubscriptionOrder(null);
    }
  };

  useEffect(() => {
    Promise.all([fetchOrders(), fetchAddresses(), fetchTodaySubscriptionOrder()]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // NEW: compute button state
  const todayStatus = String(todaySubscriptionOrder?.status || "").toLowerCase();
  const canSkipToday = todaySubscriptionOrder && todayStatus === "scheduled" && !skipDone && !skipping;

  const skipBlockReason =
    skipDone
      ? "Already marked for today."
      : todaySubscriptionOrder && todayStatus !== "scheduled"
        ? `Already '${todayStatus.replace(/_/g, " ")}'.
        `
        : "Not available.";

  return (
    <div className="space-y-6">
      {/* CHANGED: Themed Dashboard Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center ring-1 ring-white/20">
              <FiPackage className="text-3xl text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">My Orders</h2>
              <p className="text-xs sm:text-sm text-white/75 mt-1">
                On-demand orders • Subscription pickups are automatic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!canSkipToday) {
                  setError(skipBlockReason);
                  return;
                }
                handleNoPickupToday();
              }}
              disabled={skipping} // real disable only for in-flight
              aria-disabled={!canSkipToday}
              className={[
                "hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ring-1 ring-white/15",
                canSkipToday ? "bg-white/10 hover:bg-white/15" : "bg-white/10 opacity-50 cursor-not-allowed",
              ].join(" ")}
              title="Skip today’s subscription pickup"
            >
              <FiX />
              {skipDone ? "No Pickup Today Marked" : skipping ? "Marking..." : "No Pickup Today"}
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-purple-700 hover:bg-white/90"
            >
              <FiPlus />
              New Order
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 flex items-center gap-3">
          <FiCheck className="text-lg" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-3">
          <FiAlertCircle className="text-lg" />
          <span>{error}</span>
        </div>
      )}

      {/* Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Place New Order</h3>
              <button onClick={() => { setShowForm(false); setError(""); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Address Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="text-purple-600" /> Pickup Address
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  value={form.address_id}
                  onChange={(e) => setForm({ ...form, address_id: e.target.value, branch_id: "" })}
                  required
                >
                  <option value="">Select address</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>{a.full_address} ({a.pincode})</option>
                  ))}
                </select>
                {addresses.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">No addresses found. Please add one in Profile first.</p>
                )}
              </div>

              {/* Branch Selection */}
              {form.address_id && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FiTruck className="text-purple-600" /> Service Branch
                  </label>
                  {branches.length === 0 ? (
                    <div className="px-4 py-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
                      <FiAlertCircle className="inline mr-2" />
                      No branches serve this pincode. Please use a different address.
                    </div>
                  ) : (
                    <select
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={form.branch_id}
                      onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                      required
                    >
                      <option value="">Select branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.branch_name} - {b.address || b.city || ""}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Pickup Date */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiCalendar className="text-purple-600" /> Pickup Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  value={form.pickup_date}
                  onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              {/* Pickup Shift */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FiClock className="text-purple-600" /> Pickup Shift
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${form.pickup_shift === "morning" ? "bg-purple-100 ring-2 ring-purple-500" : "bg-gray-50 hover:bg-gray-100"}`}>
                    <input
                      type="radio"
                      name="shift"
                      value="morning"
                      checked={form.pickup_shift === "morning"}
                      onChange={(e) => setForm({ ...form, pickup_shift: e.target.value })}
                      className="hidden"
                    />
                    <span className="text-2xl mb-1">🌅</span>
                    <span className="font-medium text-gray-800">Morning</span>
                    <span className="text-xs text-gray-500">6 AM - 12 PM</span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all ${form.pickup_shift === "evening" ? "bg-purple-100 ring-2 ring-purple-500" : "bg-gray-50 hover:bg-gray-100"}`}>
                    <input
                      type="radio"
                      name="shift"
                      value="evening"
                      checked={form.pickup_shift === "evening"}
                      onChange={(e) => setForm({ ...form, pickup_shift: e.target.value })}
                      className="hidden"
                    />
                    <span className="text-2xl mb-1">🌆</span>
                    <span className="font-medium text-gray-800">Evening</span>
                    <span className="text-xs text-gray-500">4 PM - 8 PM</span>
                  </label>
                </div>
              </div>

              {/* Pricing Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">Pricing Info</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• ₹10 per kg</li>
                  <li>• Final amount calculated at pickup</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={submitting || (branches.length === 0 && form.address_id)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Placing Order...
                  </>
                ) : (
                  <>
                    <FiCheck />
                    Place Order
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Orders List (CHANGED: table + pagination) */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FiPackage className="text-5xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No orders yet</h3>
          <p className="text-gray-500 mb-4">Place your first on-demand laundry order</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FiPlus /> Place Order
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* table header strip */}
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-800">Your Orders</div>
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{showingFrom}-{showingTo}</span> of{" "}
                <span className="font-medium text-gray-700">{orders.length}</span>
              </div>
            </div>

            {/* pagination controls */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Prev
              </button>

              <div className="flex items-center gap-1">
                {pageButtons.map((n, idx) => {
                  const prev = pageButtons[idx - 1];
                  const gap = prev && n - prev > 1;
                  return (
                    <React.Fragment key={n}>
                      {gap ? <span className="px-1 text-gray-400">…</span> : null}
                      <button
                        className={[
                          "w-9 h-9 rounded-lg text-sm",
                          n === safePage ? "bg-purple-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
                        ].join(" ")}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              <button
                className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-3 px-4 font-medium">#</th>
                  <th className="py-3 px-4 font-medium">Pickup</th>
                  <th className="py-3 px-4 font-medium">Branch</th>
                  <th className="py-3 px-4 font-medium">Address</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Payment</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-gray-700">
                {pagedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">#{o.id}</div>
                      {/* CHANGED: always on-demand here */}
                      <div className="text-xs text-gray-500">On-demand</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-gray-900">
                        <FiCalendar className="text-gray-400" />
                        <span className="font-medium">{o.pickup_date || "-"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 capitalize">
                        <FiClock className="text-gray-400" />
                        {o.pickup_shift || "-"}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FiTruck className="text-gray-400" />
                        <span className="font-medium text-gray-900">{o.branch_name || "-"}</span>
                      </div>
                      {o.branch_id ? <div className="text-xs text-gray-500 mt-1">Branch ID: {o.branch_id}</div> : null}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <FiMapPin className="text-gray-400 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-gray-900 truncate max-w-[420px]">
                            {o.full_address || o.address_label || "-"}
                          </div>
                          {o.pincode ? <div className="text-xs text-gray-500 mt-0.5">PIN: {o.pincode}</div> : null}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(o.status)}`}>
                        {getStatusIcon(o.status)}
                        {o.status?.replace(/_/g, " ") || "-"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {o.payment_amount ? `₹${Number(o.payment_amount).toLocaleString()}` : <span className="text-gray-400">TBD</span>}
                      </div>
                      {o.payment_status ? (
                        <div className={`text-xs mt-1 ${o.payment_status === "paid" ? "text-emerald-600" : "text-orange-600"}`}>
                          {o.payment_status === "paid" ? "✓ Paid" : "Pending"}
                        </div>
                      ) : (
                        <div className="text-xs mt-1 text-gray-400">—</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {o.status === "scheduled" ? (
                        <button
                          onClick={() => handleDelete(o.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-700 bg-red-50 hover:bg-red-100"
                          title="Cancel order"
                        >
                          <FiTrash2 />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* footer pager (mobile-friendly) */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page <span className="font-medium text-gray-700">{safePage}</span> of{" "}
              <span className="font-medium text-gray-700">{totalPages}</span>
            </span>
            <span className="hidden sm:inline">
              Tip: scroll horizontally on small screens.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
