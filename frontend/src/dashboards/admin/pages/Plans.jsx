import React, { useEffect, useState } from "react";
import axios from "axios";

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
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-2">Add / Edit Plan</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Plan Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Monthly Price" value={form.monthly_price} onChange={e => setForm({ ...form, monthly_price: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Max Weight (kg)" value={form.max_weight_per_month} onChange={e => setForm({ ...form, max_weight_per_month: e.target.value })} />
          <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={handleSubmit}>
            {editingId ? "Update Plan" : "Add Plan"}
          </button>
        </div>
        <textarea
          className="mt-3 w-full border rounded px-3 py-2"
          placeholder="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Plans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-2 px-3">Plan</th>
                <th className="py-2 px-3">Price</th>
                <th className="py-2 px-3">Max Weight</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 px-3">{p.name}</td>
                  <td className="py-2 px-3">₹{Number(p.monthly_price).toLocaleString()}</td>
                  <td className="py-2 px-3">{p.max_weight_per_month} kg</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={() => handleEdit(p)}>Edit</button>
                      <button className="px-2 py-1 rounded bg-red-600 text-white text-xs" onClick={() => handleDelete(p.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td className="py-3 px-3 text-gray-500 text-sm" colSpan={4}>No plans found.</td>
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
