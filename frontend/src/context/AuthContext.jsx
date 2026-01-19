import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({
  isLoggedIn: false,
  role: null,
  loginCustomer: () => {},
  loginStaff: () => {},
  logout: () => {},
  getDashboardPath: () => "/login",
});

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("auth_role");
    if (storedRole) {
      setRole(storedRole);
      setIsLoggedIn(true);
    } else if (sessionStorage.getItem("customer_logged_in") === "1") {
      setRole("customer");
      setIsLoggedIn(true);
    }
  }, []);

  const getDashboardPath = (r = role) => {
    switch (r) {
      case "customer":
        return "/dashboards/customer";
      case "branch_manager":
        return "/dashboards/manager";
      case "delivery_staff":
        return "/dashboards/delivery";
      case "super_admin":
        return "/dashboards/admin";
      default:
        return "/login";
    }
  };

  const loginCustomer = () => {
    localStorage.setItem("auth_role", "customer");
    sessionStorage.setItem("customer_logged_in", "1");
    setRole("customer");
    setIsLoggedIn(true);
  };

  const loginStaff = (staffRole) => {
    localStorage.setItem("auth_role", staffRole);
    sessionStorage.setItem("customer_logged_in", "0");
    setRole(staffRole);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("auth_role");
    sessionStorage.removeItem("customer_logged_in");
    setRole(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, role, loginCustomer, loginStaff, logout, getDashboardPath }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
