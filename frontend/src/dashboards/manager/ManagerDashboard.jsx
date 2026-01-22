import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { FiHome, FiUsers, FiMapPin, FiClipboard, FiMap, FiMenu } from "react-icons/fi";
import ManagerSidebar from "../../components/manager/ManagerSidebar";
import Overview from "./pages/Overview";
import Staff from "./pages/Staff";
import Zones from "./pages/Zones";
import Orders from "./pages/Orders";
import Branch from "./pages/Branch";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [active, setActive] = useState(() => localStorage.getItem("manager_active_tab") || "overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleTabChange = (key) => {
    setActive(key);
    localStorage.setItem("manager_active_tab", key);
  };

  const navItems = [
    { key: "overview", label: "Overview", icon: FiHome },
    { key: "staff", label: "Staff", icon: FiUsers },
    { key: "zones", label: "Zones", icon: FiMap },
    { key: "orders", label: "Orders", icon: FiClipboard },
    { key: "branch", label: "Branch", icon: FiMapPin },
  ];

  const pages = {
    overview: <Overview />,
    staff: <Staff />,
    zones: <Zones />,
    orders: <Orders />,
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
