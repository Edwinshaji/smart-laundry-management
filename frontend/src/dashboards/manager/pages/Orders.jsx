import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiClipboard } from "react-icons/fi";

const Orders = () => {
  const [rows, setRows] = useState([]);

  const statusPill = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "delivered") return "bg-emerald-100 text-emerald-700";
    if (s === "scheduled") return "bg-blue-100 text-blue-700";
    if (s === "picked_up" || s === "washing") return "bg-amber-100 text-amber-700";
    if (s === "ready_for_delivery") return "bg-purple-100 text-purple-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const typePill = (t) => {
    const x = String(t || "").toLowerCase();
    return x === "monthly" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
  };

  useEffect(() => {
    axios
      .get(`/api/manager/orders/`, { withCredentials: true })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-blue-100">
            <FiClipboard className="text-blue-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Branch Orders</h3>
            <p className="text-sm text-gray-500 mt-0.5">Track orders across pickup and delivery stages.</p>
          </div>
        </div>
        <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          {rows.length} orders
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-3 px-4 font-medium">Order</th>
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Pickup Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-semibold text-gray-900">#{r.id}</div>
                </td>
                <td className="py-3 px-4">{r.customer}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typePill(r.order_type)}`}>
                    {String(r.order_type || "-").replace(/_/g, " ")}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusPill(r.status)}`}>
                    {String(r.status || "-").replace(/_/g, " ")}
                  </span>
                </td>
                <td className="py-3 px-4">{r.pickup_date}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-10 px-4 text-center text-gray-500" colSpan={5}>
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
