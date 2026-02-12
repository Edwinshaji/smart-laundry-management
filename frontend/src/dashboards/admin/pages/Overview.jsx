import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiDollarSign, FiGrid, FiUsers } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/admin/overview/`, { withCredentials: true })
      .then((res) => mounted && setStats(res.data))
      .catch(() => mounted && setStats(null));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (stats !== null) setLoading(false);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back!</h1>
        <p className="text-purple-100">Here’s what’s happening across the system today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Weekly Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ₹{Number(stats.weeklyRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FiDollarSign className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-purple-600">
            <span>System total</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Branches</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeBranches ?? 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FiGrid className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600">
            <span>Across all cities</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Online Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.onlineUsers ?? 0}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <FiUsers className="text-2xl text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-emerald-600">
            <span>Total users</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Branch Performance</h3>
            <span className="text-xs text-gray-500">Top branches</span>
          </div>
          <div className="p-6">
            <div className="h-48 flex items-end gap-3">
              {(stats.branchPerformance || []).map((v, i) => (
                <div key={i} className="flex-1 bg-purple-100 rounded">
                  <div className="bg-purple-500 rounded" style={{ height: `${v}%` }} />
                </div>
              ))}
              {(stats.branchPerformance || []).length === 0 && (
                <div className="text-sm text-gray-500">No data available.</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Traffic Sources</h3>
          </div>
          <div className="p-6">
            <div className="h-48 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-[14px] border-purple-400 border-t-blue-400 border-r-emerald-400" />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Search {stats.traffic?.search ?? 0}%</span>
              <span>Direct {stats.traffic?.direct ?? 0}%</span>
              <span>Social {stats.traffic?.social ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
