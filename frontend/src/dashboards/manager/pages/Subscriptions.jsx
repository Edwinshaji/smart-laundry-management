import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiCreditCard, FiFileText, FiUsers } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);

  const payStatusPill = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "paid") return "bg-emerald-100 text-emerald-700";
    if (s === "failed") return "bg-red-100 text-red-700";
    if (s === "pending") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/manager/subscriptions/`, { withCredentials: true })
      .then((res) => {
        setPlans(res.data.plans || []);
        setCustomers(res.data.customers || []);
      })
      .catch(() => {
        setPlans([]);
        setCustomers([]);
      });

    axios
      .get(`${API_BASE_URL}/api/manager/monthly-payments/`, { withCredentials: true })
      .then((res) => setPayments(res.data))
      .catch(() => setPayments([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-purple-100">
                <FiFileText className="text-purple-600 text-xl" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Monthly Plans</h3>
                <p className="text-sm text-gray-500 mt-0.5">Available subscription plans.</p>
              </div>
            </div>
            <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
              {plans.length} plans
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-3 px-4 font-medium">Plan</th>
                  <th className="py-3 px-4 font-medium">Price</th>
                  <th className="py-3 px-4 font-medium">Max Weight</th>
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
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td className="py-10 px-4 text-center text-gray-500" colSpan={3}>No plans found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-blue-100">
                <FiUsers className="text-blue-600 text-xl" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Subscribed Customers</h3>
                <p className="text-sm text-gray-500 mt-0.5">Customers currently on monthly plans.</p>
              </div>
            </div>
            <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
              {customers.length} customers
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Plan</th>
                  <th className="py-3 px-4 font-medium">Shift</th>
                  <th className="py-3 px-4 font-medium">Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {customers.map((c) => (
                  <tr key={c.user_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{c.name}</div>
                    </td>
                    <td className="py-3 px-4">{c.plan}</td>
                    <td className="py-3 px-4">{c.preferred_pickup_shift}</td>
                    <td className="py-3 px-4">{c.start_date || "-"}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td className="py-10 px-4 text-center text-gray-500" colSpan={4}>No subscribed customers.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-amber-100">
              <FiCreditCard className="text-amber-700 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Monthly Payments</h3>
              <p className="text-sm text-gray-500 mt-0.5">Payment status and fines for subscriptions.</p>
            </div>
          </div>
          <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            {payments.length} records
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{p.user}</div>
                  </td>
                  <td className="py-3 px-4">{p.plan || "-"}</td>
                  <td className="py-3 px-4">₹{Number(p.amount).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${payStatusPill(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {p.fine_amount ? `₹${Number(p.fine_amount).toLocaleString()} (${p.fine_days} days)` : "-"}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td className="py-10 px-4 text-center text-gray-500" colSpan={5}>No monthly payments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
