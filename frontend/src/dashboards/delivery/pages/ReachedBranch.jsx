import React, { useMemo } from "react";

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
  const allSelected = useMemo(
    () => reachedRows.length > 0 && selectedReached.size === reachedRows.length,
    [reachedRows.length, selectedReached.size]
  );

  const columns = (
    <>
      <th className="py-2 px-3 border-b"></th>
      <th className="py-2 px-3 border-b">#</th>
      <th className="py-2 px-3 border-b">Customer</th>
      <th className="py-2 px-3 border-b">Address</th>
      <th className="py-2 px-3 border-b">Branch</th>
      <th className="py-2 px-3 border-b">Pickup</th>
      <th className="py-2 px-3 border-b">Action</th>
    </>
  );

  const actionCell = (r) => (
    <button
      className="px-3 py-1 rounded bg-blue-600 text-white text-xs"
      onClick={() => handleReachedBranch(r.id)}
    >
      Mark Reached
    </button>
  );

  const Section = ({ title, rows, showBulk }) => (
    <div className="bg-white rounded-xl shadow p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {showBulk && (
          <button
            className="px-3 py-2 text-xs rounded-lg bg-gray-900 text-white disabled:opacity-50"
            onClick={handleReachedBranchBulk}
            disabled={!selectedReached?.size}
          >
            Mark Selected Reached
          </button>
        )}
      </div>

      <Table columns={columns}>
        {rows.length ? (
          rows.map((r, idx) =>
            renderOrderRow(r, idx, {
              checkbox: true,
              action: actionCell(r),
            })
          )
        ) : (
          <tr>
            <td className="py-3 px-3 text-sm text-gray-500" colSpan={7}>
              No orders
            </td>
          </tr>
        )}
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <LaneHeader />

      <Section title="Reached Branch Pending" rows={reachedRows} showBulk />
      <Section
        title="Older Reached Branch Pending"
        rows={reachedOlder}
        showBulk={false}
      />
    </div>
  );
};

export default ReachedBranch;
