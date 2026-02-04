import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FiPackage, FiCreditCard, FiCheckCircle, FiClock, 
  FiTruck, FiCalendar, FiStar, FiArrowRight, FiAlertCircle
} from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/customer/overview/`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/api/customer/orders/`, { withCredentials: true }),
        ]);
        setStats(overviewRes.data);
        setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data.slice(0, 5) : []);
      } catch {
        setStats({ activeOrders: 0, pendingPayments: 0, activeSubscription: false });
        setRecentOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const navigateTo = (tab) => {
    localStorage.setItem("customer_active_tab", tab);
    window.dispatchEvent(new CustomEvent("customer:navigate", { detail: { tab } }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return "bg-emerald-100 text-emerald-700";
    if (s === "scheduled") return "bg-blue-100 text-blue-700";
    if (s === "picked_up" || s === "washing") return "bg-amber-100 text-amber-700";
    if (s === "ready_for_delivery") return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back! 👋</h1>
        <p className="text-purple-100">Here's what's happening with your laundry today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div 
          onClick={() => navigateTo("orders")}
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.activeOrders || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <FiPackage className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600">
            <span>View orders</span>
            <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => navigateTo("payments")}
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.pendingPayments || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
              <FiCreditCard className="text-2xl text-orange-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-orange-600">
            <span>Pay now</span>
            <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => navigateTo("subscription")}
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Subscription</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats?.activeSubscription ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <FiCheckCircle /> Active
                  </span>
                ) : (
                  <span className="text-gray-400">None</span>
                )}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
              <FiStar className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-purple-600">
            <span>{stats?.activeSubscription ? "View plan" : "Subscribe"}</span>
            <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            onClick={() => navigateTo("orders")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiPackage className="text-xl text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">New Order</span>
          </button>
          <button 
            onClick={() => navigateTo("payments")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiCreditCard className="text-xl text-orange-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Pay Now</span>
          </button>
          <button 
            onClick={() => navigateTo("subscription")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiStar className="text-xl text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Subscription</span>
          </button>
          <button 
            onClick={() => navigateTo("profile")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 transition-all"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FiCheckCircle className="text-xl text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">My Profile</span>
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
          <button 
            onClick={() => navigateTo("orders")}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            View all <FiArrowRight />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <FiPackage className="text-4xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No orders yet</p>
            <button 
              onClick={() => navigateTo("orders")}
              className="text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              Place your first order →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FiTruck className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Order #{order.id}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <FiCalendar className="text-xs" />
                      {order.pickup_date} • <span className="capitalize">{order.pickup_shift}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status?.replace(/_/g, " ")}
                  </span>
                  {order.payment_amount && (
                    <p className="text-sm font-medium text-gray-800 mt-1">₹{order.payment_amount}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      {!stats?.activeSubscription && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiAlertCircle className="text-purple-600 text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">Save with Monthly Subscription</h3>
              <p className="text-sm text-gray-600 mt-1">
                Get daily pickups, free delivery, and save up to 30% with our subscription plans.
              </p>
              <button 
                onClick={() => navigateTo("subscription")}
                className="mt-3 text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1"
              >
                View plans <FiArrowRight />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
