import React from "react";

const OutForDelivery = ({
  LaneHeader,
  Table,
  deliverToday,
  deliverOverdue, // older/overdue
  deliverLater,
  renderOrderRow,
  handleDelivered,
}) => {
  const columns = (
    <>
      <th className="py-2 px-3 border-b">#</th>
      <th className="py-2 px-3 border-b">Customer</th>
      <th className="py-2 px-3 border-b">Address</th>
      <th className="py-2 px-3 border-b">Branch</th>
      <th className="py-2 px-3 border-b">Pickup</th>
      <th className="py-2 px-3 border-b">Delivery</th>
      <th className="py-2 px-3 border-b">Action</th>
    </>
  );

  const actionCell = (r) => (
    <button
      className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
      onClick={() => handleDelivered(r.id)}
    >
      Delivered
    </button>
  );

  const Section = ({ title, rows }) => (
    <div className="bg-white rounded-xl shadow p-5 space-y-3">
      <h3 className="font-semibold text-gray-800">{title}</h3>
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

      <Section title="Deliver Today" rows={deliverToday} />
      <Section title="Deliver Later" rows={deliverLater} />

      {/* NEW/explicit */}
      <Section
        title="Older Out for Delivery (Overdue)"
        rows={deliverOverdue}
      />
    </div>
  );
};

export default OutForDelivery;
