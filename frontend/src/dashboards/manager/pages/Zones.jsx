import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Zones = () => {
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ zone_name: "", pincodes: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchZones = () => {
    axios
      .get(`${API_BASE_URL}/api/manager/zones/`, { withCredentials: true })
      .then((res) => setZones(res.data))
      .catch(() => setZones([]));
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSubmit = async () => {
    const payload = { ...form, pincodes: form.pincodes.split(",").map(p => p.trim()).filter(Boolean) };
    if (editingId) {
      await axios.put(`${API_BASE_URL}/api/manager/zones/${editingId}/`, payload, { withCredentials: true });
      setEditingId(null);
    } else {
      await axios.post(`${API_BASE_URL}/api/manager/zones/`, payload, { withCredentials: true });
    }
    setForm({ zone_name: "", pincodes: "" });
    fetchZones();
  };

  const handleEdit = (z) => {
    setEditingId(z.id);
    setForm({ zone_name: z.zone_name, pincodes: z.pincodes.join(", ") });
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_BASE_URL}/api/manager/zones/${id}/`, { withCredentials: true });
    fetchZones();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Add / Edit Zone</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Zone Name" value={form.zone_name} onChange={e => setForm({ ...form, zone_name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Pincodes (comma separated)" value={form.pincodes} onChange={e => setForm({ ...form, pincodes: e.target.value })} />
          <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={handleSubmit}>
            {editingId ? "Update Zone" : "Add Zone"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Zones</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-2 px-3">Zone</th>
                <th className="py-2 px-3">Pincodes</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {zones.map((z) => (
                <tr key={z.id}>
                  <td className="py-2 px-3">{z.zone_name}</td>
                  <td className="py-2 px-3">{z.pincodes.join(", ")}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={() => handleEdit(z)}>Edit</button>
                      <button className="px-2 py-1 rounded bg-red-600 text-white text-xs" onClick={() => handleDelete(z.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Zones;
