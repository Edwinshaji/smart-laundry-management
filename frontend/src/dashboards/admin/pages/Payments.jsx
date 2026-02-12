import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiDollarSign } from "react-icons/fi";

const Payments = () => {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    axios
      .get(`/api/admin/payments/`, { withCredentials: true })
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-purple-100">
            <FiDollarSign className="text-purple-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Payments</h3>
            <p className="text-sm text-gray-500 mt-0.5">System payment records and statuses.</p>
          </div>
        </div>
        <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          {rows.length} records
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-3 px-4 font-medium">User</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">Amount</th>
              <th className="py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {pagedRows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">{r.user}</td>
                <td className="py-3 px-4">{r.type}</td>
                <td className="py-3 px-4">₹{Number(r.amount).toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      r.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td className="py-10 px-4 text-center text-gray-500" colSpan={4}>
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-4 border-t border-gray-100">
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
        <button
          className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50"
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
