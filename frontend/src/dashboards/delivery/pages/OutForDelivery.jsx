import React, { useMemo, useState } from "react";

const OutForDelivery = ({
  LaneHeader,
  Table,
  deliverToday,
  deliverOverdue,
  deliverLater,
  renderOrderRow,
  handleDelivered,
}) => {
  // NEW: single-table view with buckets
  const [bucket, setBucket] = useState("today"); // "today" | "later" | "overdue"

  const buckets = useMemo(
    () => [
      { key: "today", label: "Today", count: deliverToday.length },
      { key: "later", label: "Later", count: deliverLater.length },
      { key: "overdue", label: "Overdue", count: deliverOverdue.length },
    ],
    [deliverToday.length, deliverLater.length, deliverOverdue.length]
  );

  const rows = bucket === "today" ? deliverToday : bucket === "later" ? deliverLater : deliverOverdue;

  const columns = (
    <>
      <th className="py-3 px-4 w-16">#</th>
      <th className="py-3 px-4">Customer</th>
      <th className="py-3 px-4">Address</th>
      <th className="py-3 px-4">Branch</th>
      <th className="py-3 px-4">Pickup</th>
      <th className="py-3 px-4">Delivery</th>
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
            ].join(" ")}
          >
            {b.label}
            <span
              className={["ml-2 text-xs px-2 py-0.5 rounded-full", active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"].join(" ")}
            >
              {b.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const actionCell = (r) => (
    <button
      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
      onClick={() => handleDelivered(r.id)}
    >
      Delivered
    </button>
  );

  return (
    <div className="space-y-6">
      <LaneHeader />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Out for Delivery</h3>
          <p className="text-xs text-gray-500 mt-0.5">{rows.length} order(s)</p>
        </div>
        <Tabs />
      </div>

      <Table columns={columns}>
        {rows.length ? (
          rows.map((r, idx) =>
            renderOrderRow(r, idx, {
              expectedDelivery: true,
              action: actionCell(r),
            })
          )
        ) : (
          <tr>
            <td className="py-6 px-4 text-sm text-gray-500" colSpan={7}>
              No orders
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
};

export default OutForDelivery;
