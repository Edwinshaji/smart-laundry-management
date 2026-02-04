import React from "react";

const History = ({ LaneHeader, Table, historyRows, renderOrderRow }) => {
  return (
    <div className="space-y-4">
      <LaneHeader />
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Delivered</h3>
        <Table
          columns={
            <>
              <th className="py-2 px-3 border-b">No.</th>
              <th className="py-2 px-3 border-b">Customer</th>
              <th className="py-2 px-3 border-b">Address</th>
              <th className="py-2 px-3 border-b">Branch</th>
              <th className="py-2 px-3 border-b">Pickup</th>
            </>
          }
        >
          {historyRows.map((r, idx) => renderOrderRow(r, idx, { action: null }))
            .slice(0, 5)}
          {historyRows.length === 0 && (
            <tr>
              <td className="py-3 px-3 text-gray-500" colSpan={5}>
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
