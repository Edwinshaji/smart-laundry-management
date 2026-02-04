import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FiClipboard, FiCheckCircle, FiMapPin, FiMenu, FiTruck, FiUser } from "react-icons/fi";
import DeliverySidebar from "../../components/delivery/DeliverySidebar";
import PickupPending from "./pages/PickupPending";
import ReachedBranch from "./pages/ReachedBranch";
import OutForDelivery from "./pages/OutForDelivery";
import History from "./pages/History";
import DeliveryProfile from "./pages/DeliveryProfile";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [active, setActive] = useState(() => localStorage.getItem("delivery_active_tab") || "pickup");
  const [mobileOpen, setMobileOpen] = useState(false);

  // keep raw lists per-status (both demand + monthly), UI will split by lane
  const [pickups, setPickups] = useState([]);   // status=scheduled
  const [reached, setReached] = useState([]);   // status=picked_up (waiting for reached_branch)
  const [ready, setReady] = useState([]);       // status=ready_for_delivery (out for delivery)
  const [history, setHistory] = useState([]);   // status=delivered

  const [weights, setWeights] = useState({});
  const [isAvailable, setIsAvailable] = useState(null);

  // NEW: lane tabs (Demand / Subscription)
  const [lane, setLane] = useState(() => localStorage.getItem("delivery_lane") || "demand");

  // NEW: sorting controls
  const [pickupSort, setPickupSort] = useState("asc"); // by pickup_date
  const [readySort, setReadySort] = useState("asc");   // by expected_delivery_date
  const [selectedReached, setSelectedReached] = useState(() => new Set()); // bulk select

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const toStr = (d) => {
    if (!d) return "";
    if (typeof d === "string") return d.slice(0, 10);
    // if DRF returns Date objects (unlikely), fallback:
    try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleTabChange = (key) => {
    setActive(key);
    setMobileOpen(false); // NEW: close drawer on navigate (mobile)
    localStorage.setItem("delivery_active_tab", key);
  };

  // CHANGED: make these functions update state
  const fetchOrders = async (statusFilter, setter) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/delivery/orders/?status=${statusFilter}`,
        { withCredentials: true }
      );
      setter(Array.isArray(res.data) ? res.data : []);
    } catch {
      setter([]); // keep UI stable
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/delivery/me/availability/`, {
        withCredentials: true,
      });
      setIsAvailable(Boolean(res?.data?.is_available));
    } catch {
      setIsAvailable(null);
    }
  };

  const updateAvailability = (value) => {
    return axios.patch(
      `${API_BASE_URL}/api/delivery/me/availability/`,
      { is_available: value },
      { withCredentials: true }
    );
  };

  const updateOrderStatus = (orderId, newStatus, data = {}) => {
    return axios.patch(
      `${API_BASE_URL}/api/delivery/orders/${orderId}/status/`,
      { status: newStatus, ...data },
      { withCredentials: true }
    );
  };

  const refreshAll = () => {
    fetchOrders("scheduled", setPickups);
    fetchOrders("picked_up", setReached);
    fetchOrders("ready_for_delivery", setReady);
    fetchOrders("delivered", setHistory);
  };

  useEffect(() => {
    refreshAll();
    fetchAvailability();
  }, []);

  const toggleAvailability = async () => {
    const next = !isAvailable;
    await updateAvailability(next);
    setIsAvailable(next);
  };

  const handlePickupComplete = async (orderId) => {
    const weight = Number(weights[orderId]);
    if (!weight || Number.isNaN(weight)) return;
    await updateOrderStatus(orderId, "picked_up", { weight_kg: weight });
    setWeights((prev) => ({ ...prev, [orderId]: "" }));
    refreshAll();
  };

  const handleReachedBranch = async (orderId) => {
    await updateOrderStatus(orderId, "reached_branch");
    refreshAll();
  };

  const handleReachedBranchBulk = async () => {
    const ids = Array.from(selectedReached);
    if (!ids.length) return;
    // bulk via multiple requests (no new endpoint needed)
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await handleReachedBranch(id);
    }
    setSelectedReached(new Set());
  };

  const handleDelivered = async (orderId) => {
    await updateOrderStatus(orderId, "delivered");
    refreshAll();
  };

  const navItems = useMemo(
    () => [
      { key: "pickup", label: "Pickup Pending", icon: FiClipboard },
      { key: "reached", label: "Reached Branch", icon: FiMapPin },
      { key: "ready", label: "Out for Delivery", icon: FiTruck },
      { key: "history", label: "History", icon: FiCheckCircle },
      { key: "profile", label: "Profile", icon: FiUser }, // NEW
    ],
    []
  );

  const laneFilter = (rows) => rows.filter((r) => r.order_type === lane);

  const sortByDate = (rows, field, dir) => {
    const mult = dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = toStr(a?.[field]);
      const bv = toStr(b?.[field]);
      if (av === bv) return 0;
      if (!av) return 1;   // push empties last
      if (!bv) return -1;
      return av > bv ? 1 * mult : -1 * mult;
    });
  };

  // PICKUP: group into Today / Upcoming / Older (overdue)
  const pickupRows = useMemo(
    () => sortByDate(laneFilter(pickups), "pickup_date", pickupSort),
    [pickups, lane, pickupSort]
  );
  const pickupToday = useMemo(
    () => pickupRows.filter((r) => toStr(r.pickup_date) === todayStr),
    [pickupRows, todayStr]
  );
  const pickupUpcoming = useMemo(
    () => pickupRows.filter((r) => toStr(r.pickup_date) > todayStr),
    [pickupRows, todayStr]
  );
  const pickupOlder = useMemo(
    () => pickupRows.filter((r) => toStr(r.pickup_date) < todayStr),
    [pickupRows, todayStr]
  );

  // REACHED (picked_up): Current (today+upcoming) / Older
  const reachedAll = useMemo(
    () => sortByDate(laneFilter(reached), "pickup_date", "asc"),
    [reached, lane]
  );
  const reachedCurrent = useMemo(
    () => reachedAll.filter((r) => toStr(r.pickup_date) >= todayStr),
    [reachedAll, todayStr]
  );
  const reachedOlder = useMemo(
    () => reachedAll.filter((r) => toStr(r.pickup_date) < todayStr),
    [reachedAll, todayStr]
  );

  // READY/OUT: Deliver Today / Deliver Later / Older (Overdue)
  const readyRows = useMemo(
    () => sortByDate(laneFilter(ready), "expected_delivery_date", readySort),
    [ready, lane, readySort]
  );
  const deliverToday = useMemo(
    () => readyRows.filter((r) => toStr(r.expected_delivery_date) === todayStr),
    [readyRows, todayStr]
  );
  const deliverLater = useMemo(
    () => readyRows.filter((r) => toStr(r.expected_delivery_date) > todayStr),
    [readyRows, todayStr]
  );
  const deliverOverdue = useMemo(
    () => readyRows.filter((r) => toStr(r.expected_delivery_date) < todayStr),
    [readyRows, todayStr]
  );

  const renderOrderRow = (r, idx, opts = {}) => {
    // no DB ID displayed: only section-based numbering
    return (
      <tr key={r.id} className="align-top">
        {opts.checkbox && (
          <td className="py-2 px-3">
            <input
              type="checkbox"
              checked={selectedReached.has(r.id)}
              onChange={(e) => {
                setSelectedReached((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(r.id);
                  else next.delete(r.id);
                  return next;
                });
              }}
            />
          </td>
        )}
        <td className="py-2 px-3">{idx + 1}</td>
        <td className="py-2 px-3">
          <div className="font-medium text-gray-800">{r.customer}</div>
          <div className="text-xs text-gray-500">{r.customer_phone}</div>
        </td>
        <td className="py-2 px-3">
          <div className="text-sm text-gray-700">{r.full_address || r.address}</div>
          <div className="text-xs text-gray-500">{r.pincode}</div>
        </td>
        <td className="py-2 px-3">
          <div className="text-sm">{r.branch_name || "-"}</div>
        </td>
        <td className="py-2 px-3">
          <div className="text-sm">{toStr(r.pickup_date)}</div>
          <div className="text-xs text-gray-500">{r.pickup_shift}</div>
        </td>
        {opts.expectedDelivery && (
          <td className="py-2 px-3 text-sm">{toStr(r.expected_delivery_date)}</td>
        )}
        <td className="py-2 px-3">
          {opts.action}
        </td>
      </tr>
    );
  };

  const Table = ({ columns, children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[980px] border">
        <thead className="text-left text-gray-500 bg-gray-50">
          <tr>{columns}</tr>
        </thead>
        <tbody className="divide-y text-gray-700">{children}</tbody>
      </table>
    </div>
  );

  const LaneHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex gap-2">
        <button
          className={`px-3 py-2 rounded-lg text-sm border ${lane === "demand" ? "bg-purple-600 text-white border-purple-600" : "bg-white"}`}
          onClick={() => { setLane("demand"); localStorage.setItem("delivery_lane", "demand"); setSelectedReached(new Set()); }}
        >
          Demand Orders
        </button>
        <button
          className={`px-3 py-2 rounded-lg text-sm border ${lane === "monthly" ? "bg-purple-600 text-white border-purple-600" : "bg-white"}`}
          onClick={() => { setLane("monthly"); localStorage.setItem("delivery_lane", "monthly"); setSelectedReached(new Set()); }}
        >
          Subscription Orders
        </button>
      </div>

      {active === "pickup" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by pickup date</span>
          <select className="border rounded px-2 py-1 text-xs" value={pickupSort} onChange={(e) => setPickupSort(e.target.value)}>
            <option value="asc">Oldest first</option>
            <option value="desc">Newest first</option>
          </select>
        </div>
      )}

      {active === "ready" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by delivery date</span>
          <select className="border rounded px-2 py-1 text-xs" value={readySort} onChange={(e) => setReadySort(e.target.value)}>
            <option value="asc">Soonest first</option>
            <option value="desc">Latest first</option>
          </select>
        </div>
      )}
    </div>
  );

  const historyRows = useMemo(
    () => sortByDate(laneFilter(history), "pickup_date", "desc"),
    [history, lane] // minimal/stable deps
  );

  const currentPage =
    active === "pickup" ? (
      <PickupPending
        LaneHeader={LaneHeader}
        Table={Table}
        pickupToday={pickupToday}
        pickupUpcoming={pickupUpcoming}
        pickupOlder={pickupOlder} // NEW
        renderOrderRow={renderOrderRow}
        weights={weights}
        setWeights={setWeights}
        handlePickupComplete={handlePickupComplete}
      />
    ) : active === "reached" ? (
      <ReachedBranch
        LaneHeader={LaneHeader}
        Table={Table}
        reachedRows={reachedCurrent} // CHANGED: current (today+upcoming)
        reachedOlder={reachedOlder}  // NEW
        renderOrderRow={renderOrderRow}
        selectedReached={selectedReached}
        setSelectedReached={setSelectedReached}
        handleReachedBranch={handleReachedBranch}
        handleReachedBranchBulk={handleReachedBranchBulk}
      />
    ) : active === "ready" ? (
      <OutForDelivery
        LaneHeader={LaneHeader}
        Table={Table}
        deliverToday={deliverToday}
        deliverOverdue={deliverOverdue} // treat as "Older/Overdue"
        deliverLater={deliverLater}
        renderOrderRow={renderOrderRow}
        handleDelivered={handleDelivered}
      />
    ) : active === "history" ? (
      <History
        LaneHeader={LaneHeader}
        Table={Table}
        historyRows={historyRows}
        renderOrderRow={renderOrderRow}
      />
    ) : (
      <DeliveryProfile />
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliverySidebar
        items={navItems}
        activeKey={active}
        onNavigate={handleTabChange}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      <div className="md:pl-64">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg border"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Delivery Dashboard</h1>
          </div>
          <button
            onClick={toggleAvailability}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isAvailable === null
                ? "bg-gray-100 text-gray-500"
                : isAvailable
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
            }`}
            disabled={isAvailable === null}
          >
            {isAvailable === null ? "Loading..." : isAvailable ? "Available" : "Unavailable"}
          </button>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4">
          {currentPage}
        </main>
      </div>
    </div>
  );
};

export default DeliveryDashboard;
