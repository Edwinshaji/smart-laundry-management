import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useMemo } from "react"; // CHANGED: add useMemo
import { FiHome, FiClipboard, FiFileText, FiDollarSign, FiUser } from "react-icons/fi";
import CustomerNavbar from "../../components/customer/CustomerNavbar";
import Overview from "./pages/Overview";
import Subscription from "./pages/Subscription";
import Orders from "./pages/Orders";
import Payments from "./pages/Payments";
import Profile from "./pages/Profile";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [active, setActive] = useState(() => localStorage.getItem("customer_active_tab") || "overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleTabChange = (key) => {
    setActive(key);
    setMobileOpen(false);
    localStorage.setItem("customer_active_tab", key);
  };

  // NEW: allow pages to request tab navigation (e.g., Subscription -> Payments)
  useEffect(() => {
    const onNavigateTab = (e) => {
      const key = e?.detail?.tab;
      if (!key) return;
      handleTabChange(key);
    };
    window.addEventListener("customer:navigate", onNavigateTab);
    return () => window.removeEventListener("customer:navigate", onNavigateTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navItems = [
    { key: "overview", label: "Home", icon: FiHome },
    { key: "subscription", label: "Subscription", icon: FiFileText },
    { key: "orders", label: "Orders", icon: FiClipboard },
    { key: "payments", label: "Payments", icon: FiDollarSign },
    { key: "profile", label: "Profile", icon: FiUser },
  ];

  const pages = {
    overview: <Overview />,
    profile: <Profile />,
    subscription: <Subscription />,
    orders: <Orders />,
    payments: <Payments />,
  };

 
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar
        items={navItems}
        activeKey={active}
        onNavigate={handleTabChange}
        mobileOpen={mobileOpen}
        onToggle={() => setMobileOpen((v) => !v)}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* CHANGED: removed border from container */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
        {pages[active]}
      </main>
    </div>
  );
};

export default CustomerDashboard;
