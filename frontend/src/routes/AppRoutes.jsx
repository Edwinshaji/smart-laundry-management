import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import CustomerLogin from "../auth/customer/CustomerLogin";
import CustomerRegister from "../auth/customer/CustomerRegister";
import StaffLogin from "../auth/staff/StaffLogin";
import StaffRegister from "../auth/staff/StaffRegister";
import CustomerDashboard from "../dashboards/customer/CustomerDashboard";
import ManagerDashboard from "../dashboards/manager/ManagerDashboard";
import DeliveryDashboard from "../dashboards/delivery/DeliveryDashboard";
import AdminDashboard from "../dashboards/admin/AdminDashboard";
import { useAuth } from "../context/AuthContext";

const AppRoutes = () => {
  const { isLoggedIn, role, getDashboardPath } = useAuth();
  const dashboardPath = getDashboardPath(role);

  const guardDashboard = (requiredRole, component) =>
    isLoggedIn
      ? role === requiredRole
        ? component
        : <Navigate to={dashboardPath} replace />
      : <Navigate to="/login" replace />;

  const guardAuthPage = (page) =>
    isLoggedIn ? <Navigate to={dashboardPath} replace /> : page;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={guardAuthPage(<CustomerLogin />)} />
        <Route path="/register" element={guardAuthPage(<CustomerRegister />)} />
        <Route path="/staff/login" element={guardAuthPage(<StaffLogin />)} />
        <Route path="/staff/register" element={guardAuthPage(<StaffRegister />)} />

        <Route
          path="/dashboards/customer"
          element={guardDashboard("customer", <CustomerDashboard />)}
        />
        <Route
          path="/dashboards/manager"
          element={guardDashboard("branch_manager", <ManagerDashboard />)}
        />
        <Route
          path="/dashboards/delivery"
          element={guardDashboard("delivery_staff", <DeliveryDashboard />)}
        />
        <Route
          path="/dashboards/admin"
          element={guardDashboard("super_admin", <AdminDashboard />)}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;