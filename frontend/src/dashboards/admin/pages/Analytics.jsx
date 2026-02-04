import React, { useEffect, useState } from "react";
import axios from "axios";

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
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-3">System Analytics</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800">
            {stats.totalOrders}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-gray-500">Monthly Revenue</div>
          <div className="text-2xl font-bold text-gray-800">
            ₹{Number(stats.monthlyRevenue).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border p-4 md:col-span-2">
          <div className="text-sm text-gray-500 mb-2">Branch Comparison</div>
          <div className="h-40 bg-gradient-to-r from-purple-100 via-blue-100 to-emerald-100 rounded" />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
