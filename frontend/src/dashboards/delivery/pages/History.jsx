import React from "react";

const History = ({ LaneHeader, Table, historyRows, renderOrderRow }) => {
  const columns = (
    <>
      <th className="py-3 px-4 w-16">No.</th>
      <th className="py-3 px-4">Customer</th>
      <th className="py-3 px-4">Address</th>
      <th className="py-3 px-4">Branch</th>
      <th className="py-3 px-4">Pickup</th>
      <th className="py-3 px-4">Action</th>
    </>
  );

  const top5 = historyRows.slice(0, 5);

  return (
    <div className="space-y-6">
      <LaneHeader />

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Delivered</h3>
            <p className="text-xs text-gray-500 mt-0.5">Showing latest 5</p>
          </div>
        </div>

        <Table columns={columns}>
          {top5.map((r, idx) => renderOrderRow(r, idx, { action: <span className="text-xs text-gray-400">—</span> }))
            .slice(0, 5)}
          {historyRows.length === 0 && (
            <tr>
              <td className="py-6 px-4 text-gray-500 text-sm" colSpan={6}>
                No delivered orders.
              </td>
            </tr>
          )}
        </Table>
      </div>
    </div>
  );
};

export default History;
