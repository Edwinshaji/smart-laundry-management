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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Add / Edit City</h3>
          <p className="text-sm text-gray-500 mt-0.5">Create cities for branches and zones.</p>
        </div>
        <div className="p-6">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="City Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="State"
            value={form.state}
            onChange={e => setForm({ ...form, state: e.target.value })}
          />
          <button
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700"
            onClick={handleSubmit}
          >
            {editingId ? "Update City" : "Add City"}
          </button>
        </div>
        </div>
      </div>

      {/* Listing card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">Cities</h3>
            <p className="text-sm text-gray-500 mt-0.5">Manage available cities.</p>
          </div>
          <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            {cities.length} total
          </div>
        </div>
        <div className="p-4 md:p-6">

        {/* Cards for mobile/tablet: single row per city */}
        <div className="flex flex-col gap-2 md:hidden">
          {cities.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2 bg-white"
            >
              <div>
                <div className="font-medium text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-500">{c.state}</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-sm"
                  onClick={() => handleEdit(c)}
                >
                  <FiEdit2 className="text-base" /> Edit
                </button>
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 text-sm"
                  onClick={() => handleDelete(c.id)}
                >
                  <FiTrash2 className="text-base" /> Delete
                </button>
              </div>
            </div>
          ))}
          {cities.length === 0 && (
            <div className="text-sm text-gray-500">No cities found.</div>
          )}
        </div>

        {/* Table for desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-3 px-4 font-medium">City</th>
                <th className="py-3 px-4 font-medium">State</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {cities.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{c.name}</div>
                  </td>
                  <td className="py-3 px-4">{c.state}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-sm"
                        onClick={() => handleEdit(c)}
                      >
                        <FiEdit2 className="text-base" /> Edit
                      </button>
                      <button
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 text-sm"
                        onClick={() => handleDelete(c.id)}
                      >
                        <FiTrash2 className="text-base" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cities.length === 0 && (
                <tr>
                  <td className="py-10 px-4 text-center text-gray-500" colSpan={3}>
                    No cities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Cities;
