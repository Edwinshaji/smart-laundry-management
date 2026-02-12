import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiBarChart2, FiClipboard, FiDollarSign } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Analytics = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios
      .get(`/api/admin/analytics/`, { withCredentials: true })
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-blue-100">
            <FiBarChart2 className="text-blue-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">System Analytics</h3>
            <p className="text-sm text-gray-500 mt-0.5">High-level performance metrics.</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</div>
              </div>
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <FiClipboard className="text-lg text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Monthly Revenue</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">₹{Number(stats.monthlyRevenue).toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <FiDollarSign className="text-lg text-purple-600" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 bg-gray-50 md:col-span-2">
            <div className="text-sm text-gray-500 mb-2">Branch Comparison</div>
            <div className="h-40 bg-gradient-to-r from-purple-100 via-blue-100 to-emerald-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
