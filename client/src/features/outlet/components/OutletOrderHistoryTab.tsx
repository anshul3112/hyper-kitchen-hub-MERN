import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchOutletOrderHistory,
  fetchOutletHourlyHistory,
  type OrderHistoryItem,
  type Pagination,
  type HourlyPoint,
} from "../api";

// ── shared helpers ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["", "Pending", "Processing", "Completed", "Failed"];

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Failed: "bg-red-100 text-red-700",
};

function DateBtn({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const formatted = value
    ? new Date(value + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => ref.current?.showPicker()}
          className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 min-w-[140px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={formatted ? "text-gray-800" : "text-gray-400"}>{formatted ?? "Select date"}</span>
        </button>
        <input ref={ref} type="date" value={value} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full" tabIndex={-1} />
      </div>
    </div>
  );
}

// ── Order History view ─────────────────────────────────────────────────────────
function OrdersView() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchOutletOrderHistory({ page: p, limit: 20, status, startDate, endDate });
      setOrders(result.orders);
      setPagination(result.pagination);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [status, startDate, endDate]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || "All Statuses"}</option>
            ))}
          </select>
        </div>
        <DateBtn label="From" value={startDate} onChange={setStartDate} />
        <DateBtn label="To" value={endDate} onChange={setEndDate} />
        <button onClick={() => { setStatus(""); setStartDate(""); setEndDate(""); }}
          className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700">
            Orders
            {pagination.total > 0 && (
              <span className="ml-2 text-gray-400 font-normal">({pagination.total} total)</span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Order #", "Customer", "Amount", "Payment", "Fulfillment", "Status", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">#{o.orderNo}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{o.name}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">₹{o.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{o.paymentStatus}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{o.fulfillmentStatus}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.orderStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{new Date(o.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => load(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <button onClick={() => load(page + 1)} disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hourly Breakdown view ──────────────────────────────────────────────────────
function HourlyView() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchOutletHourlyHistory(date);
      setHourly(res.hourly);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load hourly data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const totalOrders = hourly.reduce((s, h) => s + h.orders, 0);
  const totalRevenue = hourly.reduce((s, h) => s + h.revenue, 0);
  const peak = hourly.reduce((a, b) => (b.orders > a.orders ? b : a), hourly[0] ?? { hour: 0, orders: 0, revenue: 0, completed: 0 });
  const maxOrders = Math.max(...hourly.map((h) => h.orders), 1);

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <DateBtn label="Date" value={date} onChange={setDate} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Orders</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Peak Hour</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {peak && peak.orders > 0 ? `${String(peak.hour).padStart(2, "0")}:00` : "—"}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading hourly data…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              Hourly Breakdown — {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
            </h3>
          </div>

          {/* Bar chart */}
          <div className="px-5 py-5">
            <div className="flex items-end gap-1 h-32">
              {hourly.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-indigo-500 rounded-t-sm transition-all"
                    style={{ height: h.orders > 0 ? `${(h.orders / maxOrders) * 100}%` : "2px", minHeight: "2px", opacity: h.orders > 0 ? 1 : 0.15 }}
                    title={`${h.orders} orders, ₹${h.revenue}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-start mt-1">
              {hourly.map((h) => (
                <div key={h.hour} className="flex-1 text-center">
                  {h.hour % 3 === 0 && (
                    <span className="text-[10px] text-gray-400">{String(h.hour).padStart(2, "0")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Hour", "Orders", "Completed", "Revenue"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hourly.filter((h) => h.orders > 0).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">No orders on this day</td>
                  </tr>
                ) : (
                  hourly
                    .filter((h) => h.orders > 0)
                    .map((h) => (
                      <tr key={h.hour} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm font-medium text-gray-700">
                          {String(h.hour).padStart(2, "0")}:00 – {String(h.hour + 1).padStart(2, "0")}:00
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-800">{h.orders}</td>
                        <td className="px-5 py-3 text-sm text-green-700">{h.completed}</td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-800">₹{h.revenue.toLocaleString()}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OutletOrderHistoryTab() {
  const [view, setView] = useState<"orders" | "hourly">("orders");

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(["orders", "hourly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === v ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v === "orders" ? "Order History" : "Hourly Breakdown"}
          </button>
        ))}
      </div>

      {view === "orders" ? <OrdersView /> : <HourlyView />}
    </div>
  );
}
