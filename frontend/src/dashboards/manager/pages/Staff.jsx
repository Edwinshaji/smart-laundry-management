import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Staff = () => {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);

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
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Delivery Staff (Approved)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">Name</th>
              <th className="py-2 px-3 border-b">Email</th>
              <th className="py-2 px-3 border-b">Phone</th>
              <th className="py-2 px-3 border-b">Zone</th>
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
                <td className="py-2 px-3">
                  <select
                    className="border rounded px-2 py-1 text-xs w-full"
                    value={r.zone_id || ""}
                    onChange={(e) => handleAssignZone(r.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.zone_name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3">{r.status}</td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    <button
                      className={`px-2 py-1 rounded text-white text-xs ${r.status === "Active" ? "bg-yellow-600" : "bg-emerald-600"}`}
                      onClick={() => handleToggleActive(r.id, r.status === "Active")}
                    >
                      {r.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-red-600 text-white text-xs"
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
                <td className="py-3 px-3 text-gray-500 text-sm" colSpan={6}>
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
