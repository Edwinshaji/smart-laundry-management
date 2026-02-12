import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiUsers } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Staff = () => {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);

  const statusPill = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "active") return "bg-emerald-100 text-emerald-700";
    if (s === "inactive") return "bg-gray-100 text-gray-700";
    if (s === "suspended") return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  };

  const fetchStaff = () => {
    axios
      .get(`${API_BASE_URL}/api/manager/staff/`, { withCredentials: true })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  };

  const fetchZones = () => {
    axios
      .get(`${API_BASE_URL}/api/manager/zones/`, { withCredentials: true })
      .then((res) => setZones(res.data))
      .catch(() => setZones([]));
  };

  useEffect(() => {
    fetchStaff();
    fetchZones();
  }, []);

  const handleAssignZone = async (staffId, zoneId) => {
    await axios.patch(`${API_BASE_URL}/api/manager/staff/${staffId}/`, { zone_id: zoneId || "" }, { withCredentials: true });
    fetchStaff();
  };

  const handleToggleActive = async (staffId, isActive) => {
    await axios.patch(`${API_BASE_URL}/api/manager/staff/${staffId}/`, { is_active: !isActive }, { withCredentials: true });
    fetchStaff();
  };

  const handleDelete = async (staffId) => {
    await axios.delete(`${API_BASE_URL}/api/manager/staff/${staffId}/`, { withCredentials: true });
    fetchStaff();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-emerald-100">
            <FiUsers className="text-emerald-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Delivery Staff (Approved)</h3>
            <p className="text-sm text-gray-500 mt-0.5">Assign zones, toggle activity, and manage staff.</p>
          </div>
        </div>
        <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          {rows.length} staff
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Phone</th>
              <th className="py-3 px-4 font-medium">Zone</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{r.name}</div>
                </td>
                <td className="py-3 px-4">{r.email}</td>
                <td className="py-3 px-4">{r.phone}</td>
                <td className="py-3 px-4">
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={r.zone_id || ""}
                    onChange={(e) => handleAssignZone(r.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.zone_name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    <button
                      className={`px-3 py-1.5 rounded-lg text-white text-xs font-medium ${r.status === "Active" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                      onClick={() => handleToggleActive(r.id, r.status === "Active")}
                    >
                      {r.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                      onClick={() => handleDelete(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-10 px-4 text-center text-gray-500" colSpan={6}>
                  No approved staff found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Staff;
