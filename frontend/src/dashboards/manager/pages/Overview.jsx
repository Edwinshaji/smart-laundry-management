import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiMap,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`/api/manager/overview/`, { withCredentials: true })
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const navigateTo = (tab) => {
    localStorage.setItem("manager_active_tab", tab);
    window.dispatchEvent(new CustomEvent("manager:navigate", { detail: { tab } }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-sm text-gray-500">Unable to load overview. Please refresh.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner (customer-like) */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back!</h1>
        <p className="text-purple-100">Here’s what’s happening in your branch today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Branch Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">₹{Number(stats.revenue || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FiDollarSign className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-purple-600">
            <span>Monthly summary</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigateTo("orders")}
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.ordersTotal ?? 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <FiClipboard className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600">
            <span>View orders</span>
            <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigateTo("staff")}
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Staff</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeStaff ?? 0}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
              <FiUsers className="text-2xl text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-emerald-600">
            <span>Manage staff</span>
            <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigateTo("approvals")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiCheckCircle className="text-xl text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Approvals</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("zones")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiMap className="text-xl text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Zones</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("subscriptions")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiFileText className="text-xl text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Subscriptions</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("branch")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiMapPin className="text-xl text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Branch</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
