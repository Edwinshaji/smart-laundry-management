import React from "react";

const PickupPending = ({
  LaneHeader,
  Table,
  pickupToday,
  pickupUpcoming,
  pickupOlder, // NEW
  renderOrderRow,
  weights,
  setWeights,
  handlePickupComplete,
}) => {
  return (
    <div className="space-y-4">
      <LaneHeader />

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Today’s pickups</h3>
        <Table
          columns={
            <>
              <th className="py-2 px-3 border-b">No.</th>
              <th className="py-2 px-3 border-b">Customer</th>
              <th className="py-2 px-3 border-b">Address</th>
              <th className="py-2 px-3 border-b">Branch</th>
              <th className="py-2 px-3 border-b">Pickup</th>
              <th className="py-2 px-3 border-b">Action</th>
            </>
          }
        >
          {pickupToday.map((r, idx) =>
            renderOrderRow(r, idx, {
              action: (
                <div className="flex items-center gap-2">
                  <input
                    className="border rounded px-2 py-1 w-24 text-sm"
                    placeholder="kg"
                    value={weights[r.id] || ""}
                    onChange={(e) =>
                      setWeights((p) => ({ ...p, [r.id]: e.target.value }))
                    }
                  />
                  <button
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
                    onClick={() => handlePickupComplete(r.id)}
                  >
                    Picked Up
                  </button>
                </div>
              ),
            })
          )}
          {pickupToday.length === 0 && (
            <tr>
              <td className="py-3 px-3 text-gray-500" colSpan={6}>
                No pickups for today.
              </td>
            </tr>
          )}
        </Table>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Upcoming pickups</h3>
        <Table
          columns={
            <>
              <th className="py-2 px-3 border-b">No.</th>
              <th className="py-2 px-3 border-b">Customer</th>
              <th className="py-2 px-3 border-b">Address</th>
              <th className="py-2 px-3 border-b">Branch</th>
              <th className="py-2 px-3 border-b">Pickup</th>
              <th className="py-2 px-3 border-b">Action</th>
            </>
          }
        >
          {pickupUpcoming.map((r, idx) =>
            renderOrderRow(r, idx, {
              action: <span className="text-xs text-gray-500">Scheduled</span>,
            })
          )}
          {pickupUpcoming.length === 0 && (
            <tr>
              <td className="py-3 px-3 text-gray-500" colSpan={6}>
                No upcoming pickups.
              </td>
            </tr>
          )}
        </Table>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Older Pickup Pending</h3>
        <Table
          columns={
            <>
              <th className="py-2 px-3 border-b">#</th>
              <th className="py-2 px-3 border-b">Customer</th>
              <th className="py-2 px-3 border-b">Address</th>
              <th className="py-2 px-3 border-b">Branch</th>
              <th className="py-2 px-3 border-b">Pickup</th>
              <th className="py-2 px-3 border-b">Action</th>
            </>
          }
        >
          {pickupOlder.map((r, idx) =>
            renderOrderRow(r, idx, {
              action: (
                <div className="flex items-center gap-2">
                  <input
                    className="border rounded px-2 py-1 w-24 text-sm"
                    placeholder="kg"
                    value={weights[r.id] ?? ""}
                    onChange={(e) =>
                      setWeights((p) => ({ ...p, [r.id]: e.target.value }))
                    }
                  />
                  <button
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
                    onClick={() => handlePickupComplete(r.id)}
                  >
                    Picked Up
                  </button>
                </div>
              ),
            })
          )}
          {pickupOlder.length === 0 && (
            <tr>
              <td className="py-3 px-3 text-sm text-gray-500" colSpan={6}>
                No orders
              </td>
            </tr>
          )}
        </Table>
      </div>
    </div>
  );
};

export default PickupPending;
