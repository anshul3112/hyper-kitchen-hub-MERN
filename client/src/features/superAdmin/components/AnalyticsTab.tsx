import { useEffect, useState } from "react";
import { fetchAnalyticsOverview, type AnalyticsOverview } from "../api";

function KpiCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetchAnalyticsOverview();
        if (!cancelled) setData(result);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
        {error}
      </div>
    );

  if (!data) return null;

  const maxRevenue = Math.max(...data.revenueByTenant.map((t) => t.revenue), 1);
  const statusColors: Record<string, string> = {
    Completed: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Processing: "bg-blue-100 text-blue-700",
    Failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={`₹${data.orders.totalRevenue.toLocaleString()}`}
          sub={`${data.orders.totalOrders} total orders`}
          color="blue"
        />
        <KpiCard
          label="Completed Orders"
          value={data.orders.completedOrders}
          sub={`${data.orders.failedOrders} failed`}
          color="green"
        />
        <KpiCard
          label="Tenants"
          value={data.tenants.totalTenants}
          sub={`${data.tenants.activeTenants} active · ${data.tenants.inactiveTenants} disabled`}
          color="purple"
        />
        <KpiCard
          label="Total Users"
          value={data.users.totalUsers}
          sub={data.users.byRole.map((r) => `${r.count} ${r.role}`).join(" · ")}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-day revenue trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue — Last 7 Days</h3>
          {data.revenueTrend.length === 0 ? (
            <p className="text-gray-400 text-sm">No data</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {data.revenueTrend.map((d) => {
                const max = Math.max(...data.revenueTrend.map((x) => x.revenue), 1);
                const heightPct = Math.max((d.revenue / max) * 100, 4);
                return (
                  <div key={d.date} className="flex flex-col items-center flex-1 group">
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-full bg-blue-400 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                        style={{ height: `${heightPct * 0.9}px` }}
                        title={`₹${d.revenue.toLocaleString()}`}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 rotate-0 leading-none">
                      {d.date.slice(5)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top tenants by revenue */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Tenants by Revenue</h3>
          {data.revenueByTenant.length === 0 ? (
            <p className="text-gray-400 text-sm">No data</p>
          ) : (
            data.revenueByTenant.map((t) => (
              <MiniBar
                key={t.tenantId}
                label={t.tenantName}
                value={t.revenue}
                max={maxRevenue}
              />
            ))
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Recent Orders</h3>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-gray-400 text-sm p-5">No orders yet</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Order #", "Customer", "Amount", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentOrders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-700">#{o.orderNo}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{o.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">
                    ₹{o.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.orderStatus] ?? "bg-gray-100 text-gray-600"}`}
                    >
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
        )}
      </div>
    </div>
  );
}
