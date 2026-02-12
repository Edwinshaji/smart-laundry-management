import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { FiHome, FiUsers, FiMapPin, FiClipboard, FiMap, FiMenu, FiCheckCircle, FiFileText } from "react-icons/fi";
import ManagerSidebar from "../../components/manager/ManagerSidebar";
import Overview from "./pages/Overview";
import Staff from "./pages/Staff";
import Zones from "./pages/Zones";
import Orders from "./pages/Orders";
import Branch from "./pages/Branch";
import Approvals from "./pages/Approvals";
import Subscriptions from "./pages/Subscriptions";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [active, setActive] = useState(() => localStorage.getItem("manager_active_tab") || "overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleTabChange = (key) => {
    setActive(key);
    setMobileOpen(false); // NEW: close drawer on navigate (mobile)
    localStorage.setItem("manager_active_tab", key);
  };

  useEffect(() => {
    const onNavigateTab = (e) => {
      const tab = e?.detail?.tab;
      if (!tab) return;
      setActive(tab);
      setMobileOpen(false);
      localStorage.setItem("manager_active_tab", tab);
    };
    window.addEventListener("manager:navigate", onNavigateTab);
    return () => window.removeEventListener("manager:navigate", onNavigateTab);
  }, []);

  const navItems = [
    { key: "overview", label: "Overview", icon: FiHome },
    { key: "approvals", label: "Approvals", icon: FiCheckCircle },
    { key: "staff", label: "Staff", icon: FiUsers },
    { key: "zones", label: "Zones", icon: FiMap },
    { key: "orders", label: "Orders", icon: FiClipboard },
    { key: "subscriptions", label: "Subscriptions", icon: FiFileText },
    { key: "branch", label: "Branch", icon: FiMapPin },
  ];

  const pages = {
    overview: <Overview />,
    approvals: <Approvals />,
    staff: <Staff />,
    zones: <Zones />,
    orders: <Orders />,
    subscriptions: <Subscriptions />,
    branch: <Branch />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerSidebar
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
            <h1 className="text-lg font-semibold text-gray-800">Manager Dashboard</h1>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
          {pages[active]}
        </main>
      </div>
    </div>
  );
};

export default ManagerDashboard;
