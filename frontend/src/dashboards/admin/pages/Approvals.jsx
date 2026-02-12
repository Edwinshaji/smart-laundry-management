import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiCheckCircle, FiUserCheck } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Approvals = () => {
  const [pending, setPending] = useState([]);

  const fetchPending = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/admin/approvals/`, { withCredentials: true });
    setPending(res.data);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (userId, action) => {
    await axios.post(`${API_BASE_URL}/api/admin/approvals/`, { user_id: userId, action }, { withCredentials: true });
    setPending(prev => prev.filter(p => p.id !== userId));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-emerald-100">
            <FiUserCheck className="text-emerald-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Pending Approvals</h3>
            <p className="text-sm text-gray-500 mt-0.5">Approve or reject new users.</p>
          </div>
        </div>
        <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          {pending.length} pending
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <FiCheckCircle className="text-2xl text-emerald-600" />
          </div>
          <div className="font-medium text-gray-800 mt-3">No pending approvals</div>
          <div className="text-sm text-gray-500 mt-1">You’re all caught up.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {pending.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{p.name}</div>
                  </td>
                  <td className="py-3 px-4">{p.role}</td>
                  <td className="py-3 px-4">{p.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                        onClick={() => handleAction(p.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium"
                        onClick={() => handleAction(p.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Approvals;
