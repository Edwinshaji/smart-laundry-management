import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { FiHome, FiGrid, FiUsers, FiCheckCircle, FiBarChart2, FiDollarSign, FiSettings, FiMenu, FiFileText } from "react-icons/fi";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Overview from "./pages/Overview";
import Cities from "./pages/Cities";
import Branches from "./pages/Branches";
import Approvals from "./pages/Approvals";
import Users from "./pages/Users";
import Analytics from "./pages/Analytics";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Plans from "./pages/Plans";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [active, setActive] = useState(() => localStorage.getItem("admin_active_tab") || "overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleTabChange = (key) => {
    setActive(key);
    setMobileOpen(false); // NEW
    localStorage.setItem("admin_active_tab", key);
  };

  const navItems = [
    { key: "overview", label: "Overview", icon: FiHome },
    { key: "cities", label: "Cities", icon: FiGrid },
    { key: "branches", label: "Branches", icon: FiGrid },
    { key: "approvals", label: "Approvals", icon: FiCheckCircle },
    { key: "users", label: "Users", icon: FiUsers },
    { key: "plans", label: "Plans", icon: FiFileText },
    { key: "payments", label: "Payments", icon: FiDollarSign },
    { key: "analytics", label: "Analytics", icon: FiBarChart2 },
    { key: "settings", label: "Settings", icon: FiSettings },
  ];

  const pages = {
    overview: <Overview />,
    cities: <Cities />,
    branches: <Branches />,
    approvals: <Approvals />,
    users: <Users />,
    analytics: <Analytics />,
    payments: <Payments />,
    settings: <Settings />,
    plans: <Plans />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
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
            <h1 className="text-lg font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
          {pages[active]}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
