import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Overview = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE_URL}/api/admin/overview/`, { withCredentials: true })
      .then((res) => mounted && setStats(res.data))
      .catch(() => mounted && setStats(null));
    return () => {
      mounted = false;
    };
  }, []);

  if (!stats) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-purple-500 to-pink-400 shadow">
          <div className="text-sm opacity-90">Weekly Revenue</div>
          <div className="text-3xl font-bold mt-2">
            ₹{Number(stats.weeklyRevenue).toLocaleString()}
          </div>
          <div className="text-xs mt-3 opacity-90">System total</div>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-blue-500 to-sky-400 shadow">
          <div className="text-sm opacity-90">Active Branches</div>
          <div className="text-3xl font-bold mt-2">{stats.activeBranches}</div>
          <div className="text-xs mt-3 opacity-90">Across all cities</div>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-emerald-500 to-teal-400 shadow">
          <div className="text-sm opacity-90">Online Users</div>
          <div className="text-3xl font-bold mt-2">{stats.onlineUsers}</div>
          <div className="text-xs mt-3 opacity-90">Total users</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Branch Performance</h3>
            <span className="text-xs text-gray-500">Top branches</span>
          </div>
          <div className="h-48 flex items-end gap-3">
            {stats.branchPerformance.map((v, i) => (
              <div key={i} className="flex-1 bg-purple-100 rounded">
                <div
                  className="bg-purple-500 rounded"
                  style={{ height: `${v}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Traffic Sources</h3>
          <div className="h-48 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-[14px] border-purple-400 border-t-blue-400 border-r-emerald-400" />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Search {stats.traffic.search}%</span>
            <span>Direct {stats.traffic.direct}%</span>
            <span>Social {stats.traffic.social}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
