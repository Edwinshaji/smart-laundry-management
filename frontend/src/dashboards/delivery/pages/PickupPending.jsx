import React, { useMemo, useState } from "react";

const PickupPending = ({
  LaneHeader,
  Table,
  pickupToday,
  pickupUpcoming,
  pickupOlder,
  renderOrderRow,
  weights,
  setWeights,
  handlePickupComplete,
}) => {
  const [bucket, setBucket] = useState("today");

  const buckets = useMemo(
    () => [
      { key: "today", label: "Today", count: pickupToday.length },
      { key: "upcoming", label: "Upcoming", count: pickupUpcoming.length },
      { key: "older", label: "Older", count: pickupOlder.length },
    ],
    [pickupToday.length, pickupUpcoming.length, pickupOlder.length]
  );

  const rows = bucket === "today" ? pickupToday : bucket === "upcoming" ? pickupUpcoming : pickupOlder;

  const cols = (
    <>
      <th className="py-3 px-4 w-16">No.</th>
      <th className="py-3 px-4">Customer</th>
      <th className="py-3 px-4">Address</th>
      <th className="py-3 px-4">Branch</th>
      <th className="py-3 px-4">Pickup</th>
      <th className="py-3 px-4">Action</th>
    </>
  );

  const Tabs = () => (
    <div className="flex items-center gap-2 overflow-x-auto">
      {buckets.map((b) => {
        const active = b.key === bucket;
        return (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            className={[
              "px-3 py-2 rounded-xl text-sm font-semibold border whitespace-nowrap transition-colors",
              active
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
            ].join(" ")}>
            {b.label}
            <span
              className={[
                "ml-2 text-xs px-2 py-0.5 rounded-full",
                active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700",
              ].join(" ")}>
              {b.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const rowAction = (r) => {
    if (bucket === "upcoming") {
      return <span className="text-xs text-gray-500">Scheduled</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <input
          className="border border-gray-200 rounded-lg px-2 py-1 w-24 text-sm bg-white"
          placeholder="kg"
          value={weights[r.id] ?? ""}
          onChange={(e) =>
            setWeights((p) => ({ ...p, [r.id]: e.target.value }))
          }
        />
        <button
          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          onClick={() => handlePickupComplete(r.id)}
          type="button"
        >
          Picked Up
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <LaneHeader />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Pickup Pending</h3>
          <p className="text-xs text-gray-500 mt-0.5">{rows.length} order(s)</p>
        </div>
        <Tabs />
      </div>

      <Table columns={cols}>
        {rows.length ? (
          rows.map((r, idx) =>
            renderOrderRow(r, idx, {
              action: rowAction(r),
            })
          )
        ) : (
          <tr>
            <td className="py-6 px-4 text-gray-500 text-sm" colSpan={6}>
              No orders
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
};

export default PickupPending;
