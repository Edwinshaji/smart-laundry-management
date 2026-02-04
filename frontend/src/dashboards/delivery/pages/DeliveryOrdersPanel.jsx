import React from "react";

const DeliveryOrdersPanel = ({ title, rows, onAction, actionLabel, showWeight, weights, setWeights }) => {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>

      <div className="md:hidden space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="border rounded-lg p-3 space-y-2">
            <div className="text-sm font-semibold text-gray-800">Order #{r.id}</div>
            <div className="text-xs text-gray-600">{r.customer}</div>
            <div className="text-xs text-gray-600">{r.address}</div>
            <div className="text-xs text-gray-600">Pickup: {r.pickup_date} • {r.pickup_shift}</div>
            {showWeight && (
              <input
                className="border rounded px-2 py-1 text-xs w-full"
                placeholder="Weight (kg)"
                value={weights?.[r.id] || ""}
                onChange={(e) => setWeights?.((prev) => ({ ...prev, [r.id]: e.target.value }))}
              />
            )}
            {onAction && (
              <button
                className="w-full mt-1 px-2 py-2 rounded bg-purple-600 text-white text-xs"
                onClick={() => onAction(r.id)}
              >
                {actionLabel}
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-sm text-gray-500">No records found.</div>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[720px] border">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b">Order</th>
              <th className="py-2 px-3 border-b">Customer</th>
              <th className="py-2 px-3 border-b">Address</th>
              <th className="py-2 px-3 border-b">Pickup</th>
              {showWeight && <th className="py-2 px-3 border-b">Weight</th>}
              {onAction && <th className="py-2 px-3 border-b">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-3">#{r.id}</td>
                <td className="py-2 px-3">{r.customer}</td>
                <td className="py-2 px-3">{r.address}</td>
                <td className="py-2 px-3">{r.pickup_date} • {r.pickup_shift}</td>
                {showWeight && (
                  <td className="py-2 px-3">
                    <input
                      className="border rounded px-2 py-1 text-xs w-24"
                      placeholder="kg"
                      value={weights?.[r.id] || ""}
                      onChange={(e) => setWeights?.((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  </td>
                )}
                {onAction && (
                  <td className="py-2 px-3">
                    <button
                      className="px-2 py-1 rounded bg-purple-600 text-white text-xs"
                      onClick={() => onAction(r.id)}
                    >
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-3 px-3 text-gray-500 text-sm" colSpan={onAction ? (showWeight ? 6 : 5) : (showWeight ? 5 : 4)}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryOrdersPanel;
