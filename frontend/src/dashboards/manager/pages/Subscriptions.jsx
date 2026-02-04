import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);

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
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Monthly Plans</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Max Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3">{p.name}</td>
                    <td className="py-2 px-3">₹{Number(p.monthly_price).toLocaleString()}</td>
                    <td className="py-2 px-3">{p.max_weight_per_month} kg</td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td className="py-3 px-3 text-gray-500 text-sm" colSpan={3}>No plans found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Subscribed Customers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3">Shift</th>
                  <th className="py-2 px-3">Start</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {customers.map((c) => (
                  <tr key={c.user_id}>
                    <td className="py-2 px-3">{c.name}</td>
                    <td className="py-2 px-3">{c.plan}</td>
                    <td className="py-2 px-3">{c.preferred_pickup_shift}</td>
                    <td className="py-2 px-3">{c.start_date || "-"}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td className="py-3 px-3 text-gray-500 text-sm" colSpan={4}>No subscribed customers.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Monthly Payments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px] border">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="py-2 px-3 border-b">Customer</th>
                <th className="py-2 px-3 border-b">Plan</th>
                <th className="py-2 px-3 border-b">Amount</th>
                <th className="py-2 px-3 border-b">Status</th>
                <th className="py-2 px-3 border-b">Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 px-3">{p.user}</td>
                  <td className="py-2 px-3">{p.plan || "-"}</td>
                  <td className="py-2 px-3">₹{Number(p.amount).toLocaleString()}</td>
                  <td className="py-2 px-3">{p.status}</td>
                  <td className="py-2 px-3">
                    {p.fine_amount ? `₹${Number(p.fine_amount).toLocaleString()} (${p.fine_days} days)` : "-"}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td className="py-3 px-3 text-gray-500 text-sm" colSpan={5}>No monthly payments found.</td>
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
