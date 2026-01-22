import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("customer");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/users/?role=${roleFilter}`, {
        withCredentials: true,
      })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));
  }, [roleFilter]);

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-gray-800">Users</h3>
        <select
          className="border rounded px-3 py-2 w-full md:w-56"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="customer">Customers</option>
          <option value="branch_manager">Managers</option>
          <option value="delivery_staff">Staff</option>
          <option value="super_admin">Admins</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">Name</th>
              <th className="py-2 px-3 border-b">Email</th>
              <th className="py-2 px-3 border-b">Phone</th>
              <th className="py-2 px-3 border-b">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2 px-3">{u.name}</td>
                <td className="py-2 px-3">{u.email}</td>
                <td className="py-2 px-3">{u.phone}</td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      u.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
