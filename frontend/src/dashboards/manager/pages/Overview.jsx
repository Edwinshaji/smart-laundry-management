import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Overview = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/manager/overview/`, { withCredentials: true })
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  if (!stats) return <div className="text-sm text-gray-500">Loading...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl p-5 text-white bg-gradient-to-br from-purple-500 to-pink-400 shadow">
        <div className="text-sm opacity-90">Branch Revenue</div>
        <div className="text-3xl font-bold mt-2">₹{Number(stats.revenue).toLocaleString()}</div>
      </div>
      <div className="rounded-xl p-5 text-white bg-gradient-to-br from-blue-500 to-sky-400 shadow">
        <div className="text-sm opacity-90">Total Orders</div>
        <div className="text-3xl font-bold mt-2">{stats.ordersTotal}</div>
      </div>
      <div className="rounded-xl p-5 text-white bg-gradient-to-br from-emerald-500 to-teal-400 shadow">
        <div className="text-sm opacity-90">Active Staff</div>
        <div className="text-3xl font-bold mt-2">{stats.activeStaff}</div>
      </div>
    </div>
  );
};

export default Overview;
