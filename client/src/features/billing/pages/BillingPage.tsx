import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import DashboardHeader from "../../../common/components/DashboardHeader";
import {
  fetchKitchenOrders,
  type KitchenOrder,
  type OrderStatusPayload,
} from "../../kitchen/api";

const SOCKET_URL = "http://localhost:8000";

// Payment status badge styles
const PAYMENT_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

// Fulfillment status badge colours
const FULFILLMENT_COLORS: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  received: "bg-yellow-100 text-yellow-700",
  cooking: "bg-orange-100 text-orange-700",
  prepared: "bg-green-100 text-green-700",
  served: "bg-gray-100 text-gray-500",
};

export default function BillingPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const socketRef = useRef<Socket | null>(null);

  // ── Fetch initial orders ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchKitchenOrders();
        setOrders(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken") ?? "";
    const outletId = localStorage.getItem("outletId") ?? "";

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("connected");
      if (outletId) socket.emit("join:outlet", { outletId });
    });
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connect_error", () => setSocketStatus("disconnected"));

    socket.on("order:new", (newOrder: KitchenOrder) => {
      setOrders((prev) =>
        prev.some((o) => o._id === newOrder._id) ? prev : [...prev, newOrder]
      );
    });

    socket.on("order:status", (payload: OrderStatusPayload) => {
      setOrders((prev) =>
        prev.map((o) =>
          o._id === payload.orderId
            ? {
                ...o,
                ...(payload.fulfillmentStatus && {
                  fulfillmentStatus: payload.fulfillmentStatus,
                }),
                ...(payload.orderStatus && { orderStatus: payload.orderStatus }),
                ...(payload.paymentStatus && {
                  paymentStatus: payload.paymentStatus,
                }),
              }
            : o
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (filter === "paid") return o.paymentStatus === "paid";
    if (filter === "pending") return o.paymentStatus !== "paid";
    return true;
  });

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCount = orders.filter((o) => o.paymentStatus !== "paid").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Billing Dashboard"
        subtitle="Track orders and payments"
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Connection indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              socketStatus === "connected"
                ? "bg-green-500"
                : socketStatus === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-500 capitalize">{socketStatus}</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard label="Total Orders" value={orders.length} />
          <SummaryCard
            label="Revenue Collected"
            value={`₹${totalRevenue.toFixed(2)}`}
            color="green"
          />
          <SummaryCard
            label="Pending Payments"
            value={pendingCount}
            color={pendingCount > 0 ? "red" : "green"}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "paid", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All Orders" : f === "paid" ? "Paid" : "Pending"}
            </button>
          ))}
        </div>

        {/* Orders table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Loading orders…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No orders found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <Th>Order #</Th>
                  <Th>Customer</Th>
                  <Th>Items</Th>
                  <Th>Amount</Th>
                  <Th>Payment</Th>
                  <Th>Fulfilment</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <Td className="font-semibold text-blue-600">#{order.orderNo}</Td>
                    <Td>{order.name ?? "—"}</Td>
                    <Td>
                      <ul className="space-y-0.5">
                        {order.itemsCart.map((item, i) => (
                          <li key={i} className="text-gray-600">
                            {item.name} × {item.qty}
                          </li>
                        ))}
                      </ul>
                    </Td>
                    <Td className="font-semibold">₹{order.totalAmount.toFixed(2)}</Td>
                    <Td>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          PAYMENT_COLORS[order.paymentStatus] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          FULFILLMENT_COLORS[order.fulfillmentStatus] ??
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.fulfillmentStatus}
                      </span>
                    </Td>
                    <Td className="text-gray-400 text-xs whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Mini sub-components ───────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "green" | "red";
}) {
  const valueColor =
    color === "green"
      ? "text-green-600"
      : color === "red"
      ? "text-red-500"
      : "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-gray-700 align-top ${className ?? ""}`}>
      {children}
    </td>
  );
}
