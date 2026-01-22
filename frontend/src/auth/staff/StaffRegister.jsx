import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import illustration from "../../assets/login-illustration.png";
import WashMateLogo from "../../assets/WashMate_logo.png";

const API_BASE_URL = "http://localhost:8000"; // Change port if needed

const StaffRegister = () => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "branch_manager",
    branch_id: "",
  });
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn, getDashboardPath } = useAuth();

  if (isLoggedIn) {
    navigate(getDashboardPath(), { replace: true });
    return null;
  }

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/branches/`)
      .then(res => setBranches(res.data))
      .catch(() => setBranches([]));
  }, []);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.branch_id) {
      setError("Please select a branch.");
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/api/accounts/staff/register/`,
        {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          branch_id: form.branch_id,
        },
        { withCredentials: true }
      );
      toast.success("Registration submitted. Awaiting approval.");
      setTimeout(() => navigate("/staff/login", { replace: true }), 800);
    } catch (err) {
      setError(
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        "Registration failed"
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      <div className="w-full md:w-5/12 flex flex-col h-screen bg-white shadow-lg md:rounded-none rounded-2xl border md:border-none mx-auto md:mx-0">
        <div className="flex flex-col justify-center items-center flex-shrink-0 px-8 md:px-16 lg:px-24 py-8 md:py-12">
          <img
            src={WashMateLogo}
            alt="WashMate Logo"
            className="w-80 h-32 object-contain rounded mb-4"
          />
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Staff Registration</h1>
            <p className="text-gray-500">Register as Branch Manager or Delivery Staff</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide px-8 md:px-16 lg:px-24 pb-8">
          <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-sm mx-auto">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Role</label>
              <select
                name="role"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="branch_manager">Branch Manager</option>
                <option value="delivery_staff">Delivery Staff</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Branch</label>
              <select
                name="branch_id"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.branch_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} - {b.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                name="full_name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.full_name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                name="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.phone}
                onChange={handleChange}
                required
                pattern="[0-9]{10,15}"
                maxLength={15}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button type="submit" className="w-full bg-purple-700 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 transition">
              Register
            </button>
            <div className="text-center text-sm text-gray-600 mt-2">
              Already registered? <Link to="/staff/login" className="text-purple-700 hover:underline">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
      <div className="hidden md:flex md:w-7/12 h-screen bg-purple-100 items-center justify-center">
        <img src={illustration} alt="Staff Register Illustration" className="max-w-xl drop-shadow-xl" />
      </div>
    </div>
  );
};

export default StaffRegister;
