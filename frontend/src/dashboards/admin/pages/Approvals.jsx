import React, { useEffect, useState } from "react";
import axios from "axios";

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
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Pending Approvals</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">Name</th>
              <th className="py-2 px-3 border-b">Role</th>
              <th className="py-2 px-3 border-b">Email</th>
              <th className="py-2 px-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {pending.map((p) => (
              <tr key={p.id}>
                <td className="py-2 px-3">{p.name}</td>
                <td className="py-2 px-3">{p.role}</td>
                <td className="py-2 px-3">{p.email}</td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 rounded bg-emerald-600 text-white text-xs" onClick={() => handleAction(p.id, "approve")}>Approve</button>
                    <button className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs" onClick={() => handleAction(p.id, "reject")}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Approvals;
