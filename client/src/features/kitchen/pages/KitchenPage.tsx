import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import DashboardHeader from "../../../common/components/DashboardHeader";
import KitchenOrderCard from "../components/KitchenOrderCard";
import {
  fetchKitchenOrders,
  type KitchenOrder,
  type OrderStatusPayload,
  FULFILLMENT_LABELS,
  FULFILLMENT_COLORS,
  FULFILLMENT_SEQUENCE,
} from "../api";

const SOCKET_URL = "http://localhost:8000";

// Status grouping order for the columns
const ACTIVE_STATUSES = FULFILLMENT_SEQUENCE.filter((s) => s !== "served");

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting"
  );

  const socketRef = useRef<Socket | null>(null);

  // ── Fetch initial orders ────────────────────────────────────────────────
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

  // ── Socket setup ────────────────────────────────────────────────────────
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
      if (outletId) {
        socket.emit("join:outlet", { outletId });
      }
    });

    socket.on("disconnect", () => setSocketStatus("disconnected"));

    socket.on("connect_error", (err) => {
      console.error("[kitchen-socket] connect error:", err.message);
      setSocketStatus("disconnected");
    });

    // ── New order placed ──
    socket.on("order:new", (newOrder: KitchenOrder) => {
      setOrders((prev) => {
        // Avoid duplicates (idempotent)
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [...prev, newOrder];
      });
    });

    // ── Fulfillment status changed ──
    socket.on("order:status", (payload: OrderStatusPayload) => {
      setOrders((prev) =>
        prev
          .map((o) => {
            if (o._id !== payload.orderId) return o;
            return {
              ...o,
              ...(payload.fulfillmentStatus && { fulfillmentStatus: payload.fulfillmentStatus }),
              ...(payload.orderStatus && { orderStatus: payload.orderStatus }),
              ...(payload.paymentStatus && { paymentStatus: payload.paymentStatus }),
            };
          })
          // Remove orders that reached "served" (handled by another screen)
          .filter((o) => o.fulfillmentStatus !== "served")
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Handle local card advance (card calls API, passes updated order here) ──
  const handleOrderAdvanced = (updated: KitchenOrder) => {
    setOrders((prev) =>
      prev
        .map((o) => (o._id === updated._id ? updated : o))
        .filter((o) => o.fulfillmentStatus !== "served")
    );
  };

  // ── Group by fulfillmentStatus for column layout ──
  const grouped = ACTIVE_STATUSES.reduce<Record<string, KitchenOrder[]>>((acc, status) => {
    acc[status] = orders.filter((o) => o.fulfillmentStatus === status);
    return acc;
  }, {});

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Kitchen Display"
        subtitle="Live order queue — advance status as each order is prepared"
      />

      {/* Socket status badge */}
      <div className="max-w-screen-2xl mx-auto px-6 pt-4 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            socketStatus === "connected"
              ? "bg-green-500"
              : socketStatus === "connecting"
              ? "bg-yellow-400 animate-pulse"
              : "bg-red-400"
          }`}
        />
        <span className="text-xs text-gray-400 capitalize">{socketStatus}</span>
        <span className="text-xs text-gray-300 ml-2">
          {orders.length} active order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading && (
          <div className="flex justify-center py-24">
            <svg
              className="animate-spin h-8 w-8 text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 text-sm max-w-md">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {ACTIVE_STATUSES.map((status) => (
              <div key={status}>
                {/* Column header */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${FULFILLMENT_COLORS[status]}`}
                  >
                    {FULFILLMENT_LABELS[status]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {grouped[status].length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-4">
                  {grouped[status].length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl py-10 flex items-center justify-center">
                      <span className="text-xs text-gray-300">No orders</span>
                    </div>
                  ) : (
                    grouped[status].map((order) => (
                      <KitchenOrderCard
                        key={order._id}
                        order={order}
                        onAdvanced={handleOrderAdvanced}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
