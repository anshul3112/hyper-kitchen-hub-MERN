import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchOrderHistory,
  fetchTenants,
  fetchHourlyHistory,
  fetchHourlyOrders,
  type OrderHistoryItem,
  type CursorPagination,
  type Tenant,
  type HourlyPoint,
} from "../api";
import HourlyOrdersModal from "../../../common/components/HourlyOrdersModal";
import OrderDetailsModal, { type OrderDetailRecord } from "../../../common/components/OrderDetailsModal";

const STATUS_OPTIONS = ["", "Pending", "Processing", "Completed", "Failed"];

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Failed: "bg-red-100 text-red-700",
};

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

function OrdersView({ tenants }: { tenants: Tenant[] }) {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [pagination, setPagination] = useState<CursorPagination>({
    nextCursor: null,
    prevCursor: null,
    perPage: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailRecord | null>(null);

  const [tenantId, setTenantId] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async (cursor?: string, prevCursor?: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchOrderHistory({
        cursor,
        prevCursor,
        perPage: 10,
        tenantId,
        status,
        startDate,
        endDate,
      });
      setOrders(result.orders);
      setPagination(result.pagination);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [tenantId, status, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
    void load();
  }, [load]);

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tenant</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant._id} value={tenant._id}>{tenant.name}</option>
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
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option || "All Statuses"}</option>
            ))}
          </select>
        </div>
        <DatePickerButton label="From" value={startDate} onChange={setStartDate} />
        <DatePickerButton label="To" value={endDate} onChange={setEndDate} />
        <button
          onClick={() => {
            setTenantId("");
            setStatus("");
            setStartDate("");
            setEndDate("");
          }}
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
          <h3 className="text-sm font-semibold text-gray-700">Order History</h3>
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
                  {["Order #", "Customer", "Tenant", "Outlet", "Amount", "Payment", "Status", "Date", "Action"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">#{order.orderNo}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{order.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{order.tenantName}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{order.outletName}</td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">₹{order.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{order.paymentStatus}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.orderStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(pagination.hasPrevPage || pagination.hasNextPage) && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-800">{currentPage}</span>
              {pagination.totalPages > 0 && (
                <> of <span className="font-semibold text-gray-800">{pagination.totalPages}</span></>
              )}
              {pagination.total > 0 && (
                <span className="text-gray-400 ml-1">({pagination.total} total)</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCurrentPage((page) => page - 1);
                  void load(undefined, pagination.prevCursor ?? undefined);
                }}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  setCurrentPage((page) => page + 1);
                  void load(pagination.nextCursor ?? undefined);
                }}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder ? (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      ) : null}
    </div>
  );
}

function HourlyView({ tenants }: { tenants: Tenant[] }) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [tenantId, setTenantId] = useState("");
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedHour, setSelectedHour] = useState<HourlyPoint | null>(null);
  const [hourOrders, setHourOrders] = useState<OrderHistoryItem[]>([]);
  const [hourOrdersLoading, setHourOrdersLoading] = useState(false);
  const [hourOrdersError, setHourOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchHourlyHistory({ date, tenantId: tenantId || undefined });
      setHourly(
        result.hourly.map((point) => ({
          hour: Number(point.hour) || 0,
          orders: Number(point.orders) || 0,
          revenue: Number(point.revenue) || 0,
          completed: Number(point.completed) || 0,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load hourly data");
    } finally {
      setLoading(false);
    }
  }, [date, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleViewHourDetails = async (point: HourlyPoint) => {
    setSelectedHour(point);
    setHourOrders([]);
    setHourOrdersError("");
    setHourOrdersLoading(true);

    try {
      const result = await fetchHourlyOrders({
        date,
        hour: point.hour,
        tenantId: tenantId || undefined,
      });
      setHourOrders(result.orders);
    } catch (e: unknown) {
      setHourOrdersError(e instanceof Error ? e.message : "Failed to load orders for this hour");
    } finally {
      setHourOrdersLoading(false);
    }
  };

  const totalOrders = hourly.reduce((sum, point) => sum + point.orders, 0);
  const totalRevenue = hourly.reduce((sum, point) => sum + point.revenue, 0);
  const maxOrders = Math.max(...hourly.map((point) => point.orders), 1);

  const peak = hourly.reduce(
    (currentPeak, point) => (point.orders > currentPeak.orders ? point : currentPeak),
    hourly[0] ?? { hour: 0, orders: 0, revenue: 0, completed: 0 }
  );

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tenant</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant._id} value={tenant._id}>{tenant.name}</option>
            ))}
          </select>
        </div>
        <DatePickerButton label="Date" value={date} onChange={setDate} />
      </div>

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
            {peak.orders > 0 ? `${String(peak.hour).padStart(2, "0")}:00` : "—"}
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

          <div className="px-5 py-5">
            <div className="flex items-end gap-1 h-32">
              {hourly.map((point) => (
                <div key={point.hour} className="flex-1 h-full flex flex-col items-center justify-end">
                  <div
                    className="w-full bg-blue-500 rounded-t-sm transition-all"
                    style={{
                      height: point.orders > 0 ? `${(point.orders / maxOrders) * 100}%` : "2px",
                      minHeight: "2px",
                      opacity: point.orders > 0 ? 1 : 0.15,
                    }}
                    title={`${point.orders} orders, ₹${point.revenue}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-start mt-1">
              {hourly.map((point) => (
                <div key={point.hour} className="flex-1 text-center">
                  {point.hour % 3 === 0 ? (
                    <span className="text-[10px] text-gray-400">{String(point.hour).padStart(2, "0")}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Hour", "Orders", "Completed", "Revenue", "Action"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hourly.filter((point) => point.orders > 0).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">No orders on this day</td>
                  </tr>
                ) : (
                  hourly
                    .filter((point) => point.orders > 0)
                    .map((point) => (
                      <tr key={point.hour} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm font-medium text-gray-700">
                          {String(point.hour).padStart(2, "0")}:00 – {String(point.hour + 1).padStart(2, "0")}:00
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-800">{point.orders}</td>
                        <td className="px-5 py-3 text-sm text-green-700">{point.completed}</td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-800">₹{point.revenue.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => void handleViewHourDetails(point)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedHour ? (
        <HourlyOrdersModal
          title={`${String(selectedHour.hour).padStart(2, "0")}:00 to ${String(selectedHour.hour + 1).padStart(2, "0")}:00`}
          subtitle={new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          orders={hourOrders}
          loading={hourOrdersLoading}
          error={hourOrdersError}
          onClose={() => setSelectedHour(null)}
          onViewOrder={(order) => {
            setSelectedOrder(order);
          }}
        />
      ) : null}

      {selectedOrder ? (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      ) : null}
    </div>
  );
}

export default function OrderHistoryTab() {
  const [view, setView] = useState<"orders" | "hourly">("orders");
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    fetchTenants().then((result) => setTenants(result.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(["orders", "hourly"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "orders" ? "Order History" : "Hourly Breakdown"}
          </button>
        ))}
      </div>

      {view === "orders" ? <OrdersView tenants={tenants} /> : <HourlyView tenants={tenants} />}
    </div>
  );
}
