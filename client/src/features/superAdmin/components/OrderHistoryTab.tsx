import { useEffect, useState, useCallback, useRef } from "react";
import { fetchOrderHistory, fetchTenants, type OrderHistoryItem, type Pagination, type Tenant } from "../api";

const STATUS_OPTIONS = ["", "Pending", "Processing", "Completed", "Failed"];

function DatePickerButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formatted = value
    ? new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => inputRef.current?.showPicker()}
          className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-w-[140px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={formatted ? "text-gray-800" : "text-gray-400"}>
            {formatted ?? "Select date"}
          </span>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Failed: "bg-red-100 text-red-700",
};

export default function OrderHistoryTab() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [tenantId, setTenantId] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchTenants().then((r) => setTenants(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchOrderHistory({
        page: p, limit: 20, tenantId, status, startDate, endDate,
      });
      setOrders(result.orders);
      setPagination(result.pagination);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [tenantId, status, startDate, endDate]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tenant</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || "All Statuses"}</option>
            ))}
          </select>
        </div>
        <DatePickerButton label="From" value={startDate} onChange={setStartDate} />
        <DatePickerButton label="To" value={endDate} onChange={setEndDate} />
        <button
          onClick={() => { setTenantId(""); setStatus(""); setStartDate(""); setEndDate(""); }}
          className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700">
            Order History
            {pagination.total > 0 && (
              <span className="ml-2 text-gray-400 font-normal">({pagination.total} total)</span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Order #", "Customer", "Tenant", "Outlet", "Amount", "Payment", "Status", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">#{o.orderNo}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{o.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{o.tenantName}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{o.outletName}</td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">
                      ₹{o.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{o.paymentStatus}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.orderStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {new Date(o.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
