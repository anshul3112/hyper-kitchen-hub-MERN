import type { OrderDetailRecord } from "./OrderDetailsModal";
import ModalShell from "./ModalShell";

type Props = {
  title: string;
  subtitle: string;
  orders: OrderDetailRecord[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onViewOrder: (order: OrderDetailRecord) => void;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function HourlyOrdersModal({
  title,
  subtitle,
  orders,
  loading,
  error,
  onClose,
  onViewOrder,
}: Props) {
  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const completedOrders = orders.filter((order) => order.orderStatus === "Completed").length;

  return (
    <ModalShell title={title} subtitle={subtitle} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Orders", value: String(orders.length) },
            { label: "Completed", value: String(completedOrders) },
            { label: "Revenue", value: formatCurrency(totalRevenue) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>

        {loading ? <div className="py-8 text-center text-sm text-gray-500">Loading orders...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        {!loading && !error ? (
          orders.length === 0 ? (
            <div className="rounded-xl border border-gray-200 px-4 py-6 text-sm text-gray-500">
              No orders were found for this hour.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        "Order #",
                        "Customer",
                        "Amount",
                        "Payment",
                        "Status",
                        "Placed At",
                        "Action",
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">#{order.orderNo}</td>
                        <td className="px-4 py-3 text-gray-700">{order.name}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3 text-gray-600">{order.paymentStatus}</td>
                        <td className="px-4 py-3 text-gray-600">{order.orderStatus}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(order.date).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onViewOrder(order)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}
      </div>
    </ModalShell>
  );
}