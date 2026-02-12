import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiFileText } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    name: "",
    monthly_price: "",
    max_weight_per_month: "",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);

  const fetchPlans = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/admin/plans/`, { withCredentials: true });
    setPlans(res.data);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSubmit = async () => {
    if (editingId) {
      await axios.put(`${API_BASE_URL}/api/admin/plans/${editingId}/`, form, { withCredentials: true });
      setEditingId(null);
    } else {
      await axios.post(`${API_BASE_URL}/api/admin/plans/`, form, { withCredentials: true });
    }
    setForm({ name: "", monthly_price: "", max_weight_per_month: "", description: "" });
    fetchPlans();
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      monthly_price: p.monthly_price,
      max_weight_per_month: p.max_weight_per_month,
      description: p.description || "",
    });
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API_BASE_URL}/api/admin/plans/${id}/`, { withCredentials: true });
    fetchPlans();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-amber-100">
              <FiFileText className="text-amber-700 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Add / Edit Plan</h3>
              <p className="text-sm text-gray-500 mt-0.5">Create subscription plans for customers.</p>
            </div>
          </div>
          <button
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700"
            onClick={handleSubmit}
          >
            {editingId ? "Update Plan" : "Add Plan"}
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Plan Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Monthly Price"
              value={form.monthly_price}
              onChange={e => setForm({ ...form, monthly_price: e.target.value })}
            />
            <input
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Max Weight (kg)"
              value={form.max_weight_per_month}
              onChange={e => setForm({ ...form, max_weight_per_month: e.target.value })}
            />
          </div>

          <textarea
            className="mt-3 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">Plans</h3>
            <p className="text-sm text-gray-500 mt-0.5">All available subscription plans.</p>
          </div>
          <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            {plans.length} plans
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Max Weight</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{p.name}</div>
                  </td>
                  <td className="py-3 px-4">₹{Number(p.monthly_price).toLocaleString()}</td>
                  <td className="py-3 px-4">{p.max_weight_per_month} kg</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                        onClick={() => handleEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td className="py-10 px-4 text-center text-gray-500" colSpan={4}>
                    No plans found.
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

export default Plans;
