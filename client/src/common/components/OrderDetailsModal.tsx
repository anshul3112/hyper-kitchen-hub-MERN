import ModalShell from "./ModalShell";

export type OrderDetailRecord = {
  _id: string;
  orderNo: number;
  name: string;
  totalAmount: number;
  orderStatus: string;
  fulfillmentStatus?: string;
  paymentStatus: string;
  date: string;
  tenant?: { tenantId: string; tenantName: string };
  outlet?: { outletId: string; outletName: string };
  tenantName?: string;
  outletName?: string;
  itemsCart?: Array<{ itemId?: string; name: string; qty: number; price: number }>;
};

type Props = {
  order: OrderDetailRecord;
  onClose: () => void;
};

function formatCurrency(amount?: number) {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderDetailsModal({ order, onClose }: Props) {
  const tenantName = order.tenantName || order.tenant?.tenantName || "-";
  const outletName = order.outletName || order.outlet?.outletName || "-";
  const items = order.itemsCart ?? [];

  return (
    <ModalShell
      title={`Order #${order.orderNo}`}
      subtitle={`${order.name || "Customer unavailable"} · ${formatDateTime(order.date)}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Amount", value: formatCurrency(order.totalAmount) },
            { label: "Order Status", value: order.orderStatus || "-" },
            { label: "Payment Status", value: order.paymentStatus || "-" },
            { label: "Fulfillment", value: order.fulfillmentStatus || "-" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800">Customer & Routing</h3>
            <dl className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Customer</dt>
                <dd className="text-right font-medium text-gray-800">{order.name || "-"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Tenant</dt>
                <dd className="text-right">{tenantName}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Outlet</dt>
                <dd className="text-right">{outletName}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Placed At</dt>
                <dd className="text-right">{formatDateTime(order.date)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800">Commercial Summary</h3>
            <dl className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Items</dt>
                <dd className="text-right font-medium text-gray-800">{items.length}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Total Quantity</dt>
                <dd className="text-right font-medium text-gray-800">
                  {items.reduce((sum, item) => sum + (item.qty || 0), 0)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-gray-400">Gross Amount</dt>
                <dd className="text-right font-medium text-gray-800">{formatCurrency(order.totalAmount)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">Items</h3>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">No line-item details are available for this order.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Item",
                      "Quantity",
                      "Unit Price",
                      "Line Total",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={`${item.itemId ?? item.name}-${index}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.qty}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(item.price * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}