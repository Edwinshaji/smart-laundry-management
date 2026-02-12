import React, { useMemo, useState } from "react";

const ReachedBranch = ({
  LaneHeader,
  Table,
  reachedRows,
  reachedOlder,
  renderOrderRow,
  selectedReached,
  setSelectedReached,
  handleReachedBranch,
  handleReachedBranchBulk,
}) => {
  // NEW: single-table view with buckets
  const [bucket, setBucket] = useState("current"); // "current" | "older"

  const rows = bucket === "current" ? reachedRows : reachedOlder;
  const bulkEnabled = bucket === "current";

  const buckets = useMemo(
    () => [
      { key: "current", label: "Current", count: reachedRows.length },
      { key: "older", label: "Older", count: reachedOlder.length },
    ],
    [reachedRows.length, reachedOlder.length]
  );

  const Tabs = () => (
    <div className="flex items-center gap-2 overflow-x-auto">
      {buckets.map((b) => {
        const active = b.key === bucket;
        return (
          <button
            key={b.key}
            onClick={() => {
              setBucket(b.key);
              setSelectedReached(new Set()); // keep selection scoped to visible bucket
            }}
            className={[
              "px-3 py-2 rounded-xl text-sm font-semibold border whitespace-nowrap transition-colors",
              active
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
            ].join(" ")}>
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

  const columns = () => (
    <>
      {bulkEnabled ? (
        <th className="py-3 px-4 w-12">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={rows.length > 0 && selectedReached.size === rows.length}
            onChange={(e) => {
              const checked = e.target.checked;
              setSelectedReached(() => (checked ? new Set(rows.map((r) => r.id)) : new Set()));
            }}
            aria-label="Select all"
          />
        </th>
      ) : null}
      <th className="py-3 px-4 w-16">#</th>
      <th className="py-3 px-4">Customer</th>
      <th className="py-3 px-4">Address</th>
      <th className="py-3 px-4">Branch</th>
      <th className="py-3 px-4">Pickup</th>
      <th className="py-3 px-4">Action</th>
    </>
  );

  const actionCell = (r) => (
    <button
      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
      onClick={() => handleReachedBranch(r.id)}
    >
      Mark Reached
    </button>
  );

  const hasSelection = bulkEnabled && (selectedReached?.size || 0) > 0;

  return (
    <div className="space-y-6 pb-16">
      <LaneHeader />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Reached Branch Pending</h3>
          <p className="text-xs text-gray-500 mt-0.5">{rows.length} order(s)</p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs />
          {bulkEnabled ? (
            <button
              className="hidden md:inline-flex px-3 py-2 text-xs rounded-lg bg-gray-900 hover:bg-black text-white font-semibold disabled:opacity-50"
              onClick={handleReachedBranchBulk}
              disabled={!selectedReached?.size}
              title="Mark selected orders as reached"
            >
              Mark Selected
            </button>
          ) : null}
        </div>
      </div>

      <Table columns={columns()}>
        {rows.length ? (
          rows.map((r, idx) =>
            renderOrderRow(r, idx, {
              checkbox: bulkEnabled,
              action: actionCell(r),
            })
          )
        ) : (
          <tr>
            <td className="py-6 px-4 text-sm text-gray-500" colSpan={bulkEnabled ? 7 : 6}>
              No orders
            </td>
          </tr>
        )}
      </Table>

      {/* bottom action bar (only for Current bucket) */}
      {hasSelection ? (
        <div className="fixed left-0 right-0 bottom-0 md:left-64 z-40">
          <div className="mx-auto max-w-7xl px-4 md:px-6 pb-4">
            <div className="bg-white border border-gray-200 shadow-lg rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{selectedReached.size}</span> selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-800"
                  onClick={() => setSelectedReached(new Set())}
                >
                  Clear
                </button>
                <button
                  className="px-3 py-2 rounded-lg text-sm bg-gray-900 hover:bg-black text-white font-semibold"
                  onClick={handleReachedBranchBulk}
                >
                  Mark Reached
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReachedBranch;
