import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import illustration from "../../assets/login-illustration.png";
import WashMateLogo from "../../assets/WashMate_logo.png";

const API_BASE_URL = "http://localhost:8000"; // Change port if needed

const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("branch_manager");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn, loginStaff, getDashboardPath, role: userRole } = useAuth();

  if (isLoggedIn) {
    navigate(getDashboardPath(userRole), { replace: true });
    return null;
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(
        `${API_BASE_URL}/api/accounts/staff/login/`,
        { email, password, role },
        { withCredentials: true }
      );
      toast.success("Login successful!");
      loginStaff(role);
      navigate(getDashboardPath(role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        "Login failed"
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row">
      <div className="w-full md:w-5/12 flex flex-col justify-center items-center min-h-screen px-4 py-8 md:px-8 lg:px-16 bg-white shadow-lg md:rounded-none rounded-2xl border md:border-none mx-auto md:mx-0">
        <div className="mb-4 flex flex-col items-center">
          <img
            src={WashMateLogo}
            alt="WashMate Logo"
            className="w-80 h-32 object-contain rounded"
          />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Staff Login</h1>
          <p className="text-gray-500">Enter your staff credentials</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-sm">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Role</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={role}
              onChange={e => setRole(e.target.value)}
              required
            >
              <option value="branch_manager">Branch Manager</option>
              <option value="delivery_staff">Delivery Staff</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button type="submit" className="w-full bg-purple-700 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 transition">
            Sign in
          </button>
        </form>
        <div className="mt-8 text-center text-sm text-gray-600">
          Staff ? Don't have an account! <Link to="/staff/register" className="text-purple-700 hover:underline">Register here</Link>
        </div>
      </div>
      <div className="hidden md:flex md:w-7/12 bg-purple-100 items-center justify-center">
        <img src={illustration} alt="Staff Login Illustration" className="max-w-xl drop-shadow-xl" />
      </div>
    </div>
  );
};

export default StaffLogin;