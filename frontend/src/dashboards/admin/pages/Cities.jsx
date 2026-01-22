import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Cities = () => {
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ name: "", state: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchCities = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/admin/cities/`, { withCredentials: true });
    setCities(res.data);
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleSubmit = async () => {
    if (editingId) {
      await axios.put(`${API_BASE_URL}/api/admin/cities/${editingId}/`, form, { withCredentials: true });
      setEditingId(null);
    } else {
      await axios.post(`${API_BASE_URL}/api/admin/cities/`, form, { withCredentials: true });
    }
    setForm({ name: "", state: "" });
    fetchCities();
  };

  const handleEdit = (city) => {
    setEditingId(city.id);
    setForm({ name: city.name, state: city.state });
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_BASE_URL}/api/admin/cities/${id}/`, { withCredentials: true });
    fetchCities();
  };

  return (
    <div className="space-y-6">
      {/* Form card */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Add / Edit City</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input className="border rounded px-3 py-2" placeholder="City Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
          <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={handleSubmit}>
            {editingId ? "Update City" : "Add City"}
          </button>
        </div>
      </div>

      {/* Listing card */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Cities</h3>

        {/* Cards for mobile/tablet: single row per city */}
        <div className="flex flex-col gap-2 md:hidden">
          {cities.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border rounded-lg px-3 py-2"
            >
              <div>
                <div className="font-medium text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-500">{c.state}</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-sm"
                  onClick={() => handleEdit(c)}
                >
                  <FiEdit2 className="text-base" /> Edit
                </button>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 text-sm"
                  onClick={() => handleDelete(c.id)}
                >
                  <FiTrash2 className="text-base" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Table for desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-2 px-3">City</th>
                <th className="py-2 px-3">State</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {cities.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 px-3">{c.name}</td>
                  <td className="py-2 px-3">{c.state}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-sm"
                        onClick={() => handleEdit(c)}
                      >
                        <FiEdit2 className="text-base" /> Edit
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 text-sm"
                        onClick={() => handleDelete(c.id)}
                      >
                        <FiTrash2 className="text-base" /> Delete
                      </button>
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

export default Cities;
