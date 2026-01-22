import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Orders = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/manager/orders/`, { withCredentials: true })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Branch Orders</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">Order</th>
              <th className="py-2 px-3 border-b">Customer</th>
              <th className="py-2 px-3 border-b">Type</th>
              <th className="py-2 px-3 border-b">Status</th>
              <th className="py-2 px-3 border-b">Pickup Date</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-3">#{r.id}</td>
                <td className="py-2 px-3">{r.customer}</td>
                <td className="py-2 px-3">{r.order_type}</td>
                <td className="py-2 px-3">{r.status}</td>
                <td className="py-2 px-3">{r.pickup_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
