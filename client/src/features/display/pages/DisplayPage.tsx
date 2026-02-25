import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  fetchDisplayOrders,
  getDisplayToken,
  type DisplayOrder,
  type OrderStatusPayload,
  FULFILLMENT_LABELS,
  FULFILLMENT_COLORS,
} from "../api";

const SOCKET_URL = "http://localhost:8000";

function OrderCard({ order }: { order: DisplayOrder }) {
  const badgeClass = FULFILLMENT_COLORS[order.fulfillmentStatus];
  const isReady = order.fulfillmentStatus === "prepared";

  return (
    <div
      className={`bg-white rounded-lg border ${
        isReady ? "border-green-400" : "border-gray-200"
      } p-4 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-3xl font-black text-gray-800">#{order.orderNo}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
          {FULFILLMENT_LABELS[order.fulfillmentStatus]}
        </span>
      </div>
      {order.name && (
        <p className="text-sm font-medium text-gray-600">{order.name}</p>
      )}
      <div className="space-y-0.5">
        {order.itemsCart.map((item, i) => (
          <p key={i} className="text-xs text-gray-500">
            {item.qty}× {item.name}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function DisplayPage() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting"
  );

  const socketRef = useRef<Socket | null>(null);
  const outletName = localStorage.getItem("displayOutletName") ?? "Outlet";
  const outletId = localStorage.getItem("displayOutletId") ?? "";

  useEffect(() => {
    fetchDisplayOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = getDisplayToken();
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketStatus("connected");
      if (outletId) socket.emit("join:outlet", { outletId });
    });
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connect_error", () => setSocketStatus("disconnected"));

    socket.on("order:new", (newOrder: DisplayOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [...prev, newOrder];
      });
    });

    socket.on("order:status", (payload: OrderStatusPayload) => {
      setOrders((prev) =>
        prev
          .map((o) =>
            o._id !== payload.orderId
              ? o
              : { ...o, ...(payload.fulfillmentStatus && { fulfillmentStatus: payload.fulfillmentStatus }) }
          )
          .filter((o) => o.fulfillmentStatus !== "served")
      );
    });

    return () => { socket.disconnect(); };
  }, [outletId]);

  const readyOrders = orders.filter((o) => o.fulfillmentStatus === "prepared");
  const inProgressOrders = orders.filter((o) => o.fulfillmentStatus !== "prepared");

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{outletName}</h1>
          <p className="text-xs text-gray-400">Order Status</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              socketStatus === "connected"
                ? "bg-green-400"
                : socketStatus === "connecting"
                ? "bg-yellow-400"
                : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-500 capitalize">{socketStatus}</span>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400 text-sm">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-gray-400 text-lg font-medium">No active orders</p>
            <p className="text-gray-600 text-sm mt-1">Orders will appear here once placed</p>
          </div>
        ) : (
          <div className="space-y-8">
            {readyOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-green-400 uppercase tracking-wider">
                    Ready to Collect
                  </h2>
                  <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {readyOrders.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                  {readyOrders.map((o) => (
                    <OrderCard key={o._id} order={o} />
                  ))}
                </div>
              </section>
            )}

            {inProgressOrders.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  In Progress ({inProgressOrders.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                  {inProgressOrders.map((o) => (
                    <OrderCard key={o._id} order={o} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
