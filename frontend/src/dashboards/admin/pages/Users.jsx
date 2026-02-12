import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiUsers } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("customer");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/admin/users/?role=${roleFilter}`, { withCredentials: true })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));
  }, [roleFilter]);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-emerald-100">
            <FiUsers className="text-emerald-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Users</h3>
            <p className="text-sm text-gray-500 mt-0.5">Browse users by role.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            {users.length} users
          </div>
          <select
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="customer">Customers</option>
            <option value="branch_manager">Managers</option>
            <option value="delivery_staff">Staff</option>
            <option value="super_admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Phone</th>
              <th className="py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{u.name}</div>
                </td>
                <td className="py-3 px-4">{u.email}</td>
                <td className="py-3 px-4">{u.phone}</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
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
            {users.length === 0 && (
              <tr>
                <td className="py-10 px-4 text-center text-gray-500" colSpan={4}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
