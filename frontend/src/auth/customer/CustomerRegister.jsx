import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import illustration from "../../assets/login-illustration.png";
import WashMateLogo from "../../assets/WashMate_logo.png";

const API_BASE_URL = "http://localhost:8000"; // Change port if needed

const CustomerRegister = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await axios.post(
        `${API_BASE_URL}/api/accounts/customer/register/`,
        { full_name: fullName, email, phone, password },
        { withCredentials: true }
      );
      toast.success("Registration successful! Please login.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.email?.[0] ||
          err.response?.data?.detail ||
          "Registration failed"
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-5/12 flex flex-col justify-center items-center h-screen px-8 md:px-16 lg:px-24 py-8 md:py-12 bg-white shadow-lg md:rounded-none rounded-2xl border md:border-none mx-auto md:mx-0">
        <div className="mb-4 flex flex-col items-center">
          <img
            src={WashMateLogo}
            alt="WashMate Logo"
            className="w-80 h-32 object-contain rounded"
          />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Create your account
          </h1>
          <p className="text-gray-500">Please enter your details</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-sm">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              pattern="[0-9]{10,15}"
              maxLength={15}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-purple-700 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 transition"
          >
            Sign up
          </button>
          <div className="text-center text-sm text-gray-600 mt-2">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-700 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
      <div className="hidden md:flex md:w-7/12 h-screen bg-purple-100 items-center justify-center">
        <img
          src={illustration}
          alt="Register Illustration"
          className="max-w-xl drop-shadow-xl"
        />
      </div>
    </div>
  );
};

export default CustomerRegister;
