import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Staff = () => {
  const [rows, setRows] = useState([]);

  const fetchStaff = () => {
    axios
      .get(`${API_BASE_URL}/api/manager/staff/`, { withCredentials: true })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAction = async (user_id, action) => {
    await axios.post(`${API_BASE_URL}/api/manager/staff/`, { user_id, action }, { withCredentials: true });
    fetchStaff();
  };

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Delivery Staff</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">Name</th>
              <th className="py-2 px-3 border-b">Email</th>
              <th className="py-2 px-3 border-b">Phone</th>
              <th className="py-2 px-3 border-b">Status</th>
              <th className="py-2 px-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-3">{r.name}</td>
                <td className="py-2 px-3">{r.email}</td>
                <td className="py-2 px-3">{r.phone}</td>
                <td className="py-2 px-3">{r.status}</td>
                <td className="py-2 px-3">
                  {!r.approved ? (
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 rounded bg-emerald-600 text-white text-xs"
                        onClick={() => handleAction(r.user_id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs"
                        onClick={() => handleAction(r.user_id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Approved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Staff;
