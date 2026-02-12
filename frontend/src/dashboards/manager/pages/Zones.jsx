import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiMap, FiEdit2, FiTrash2 } from "react-icons/fi";

const Zones = () => {
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ zone_name: "", pincodes: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchZones = () => {
    axios
      .get(`/api/manager/zones/`, { withCredentials: true })
      .then((res) => setZones(res.data))
      .catch(() => setZones([]));
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSubmit = async () => {
    const payload = { ...form, pincodes: form.pincodes.split(",").map((p) => p.trim()).filter(Boolean) };
    if (editingId) {
      await axios.put(`/api/manager/zones/${editingId}/`, payload, { withCredentials: true });
      setEditingId(null);
    } else {
      await axios.post(`/api/manager/zones/`, payload, { withCredentials: true });
    }
    setForm({ zone_name: "", pincodes: "" });
    fetchZones();
  };

  const handleEdit = (z) => {
    setEditingId(z.id);
    setForm({ zone_name: z.zone_name, pincodes: z.pincodes.join(", ") });
  };

  const handleDelete = async (id) => {
    await axios.delete(`/api/manager/zones/${id}/`, { withCredentials: true });
    fetchZones();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-purple-100">
              <FiMap className="text-purple-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Add / Edit Zone</h3>
              <p className="text-sm text-gray-500 mt-0.5">Group pincodes into service zones.</p>
            </div>
          </div>
          {editingId ? (
            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
              Editing
            </span>
          ) : null}
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
              placeholder="Zone Name"
              value={form.zone_name}
              onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
            />
            <input
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
              placeholder="Pincodes (comma separated)"
              value={form.pincodes}
              onChange={(e) => setForm({ ...form, pincodes: e.target.value })}
            />
            <button
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700"
              onClick={handleSubmit}
            >
              {editingId ? "Update Zone" : "Add Zone"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">Zones</h3>
            <p className="text-sm text-gray-500 mt-0.5">{zones.length} total</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-3 px-4 font-medium">Zone</th>
                <th className="py-3 px-4 font-medium">Pincodes</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {zones.map((z) => (
                <tr key={z.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{z.zone_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-700">{Array.isArray(z.pincodes) ? z.pincodes.join(", ") : "-"}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                        onClick={() => handleEdit(z)}
                      >
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                        onClick={() => handleDelete(z.id)}
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr>
                  <td className="py-10 px-4 text-center text-gray-500" colSpan={3}>
                    No zones yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Zones;
