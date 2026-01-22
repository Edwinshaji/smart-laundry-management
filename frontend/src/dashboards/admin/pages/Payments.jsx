import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Payments = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/payments/`, { withCredentials: true })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Payments</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">User</th>
              <th className="py-2 px-3 border-b">Type</th>
              <th className="py-2 px-3 border-b">Amount</th>
              <th className="py-2 px-3 border-b">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 divide-y">
            {pagedRows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-3">{r.user}</td>
                <td className="py-2 px-3">{r.type}</td>
                <td className="py-2 px-3">₹{Number(r.amount).toLocaleString()}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-1 rounded text-xs ${r.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
        <button
          className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Payments;
