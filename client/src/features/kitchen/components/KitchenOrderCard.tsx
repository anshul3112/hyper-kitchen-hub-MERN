import { useState } from "react";
import {
  type KitchenOrder,
  type FulfillmentStatus,
  FULFILLMENT_LABELS,
  FULFILLMENT_COLORS,
  FULFILLMENT_NEXT_ACTION,
  FULFILLMENT_SEQUENCE,
  advanceFulfillmentStatus,
} from "../api";

interface Props {
  order: KitchenOrder;
  onAdvanced: (updated: KitchenOrder) => void;
}

// Top border accent per status
const BORDER_COLORS: Record<FulfillmentStatus, string> = {
  created: "border-t-blue-500",
  received: "border-t-yellow-500",
  cooking: "border-t-orange-500",
  prepared: "border-t-green-500",
  served: "border-t-gray-400",
};

export default function KitchenOrderCard({ order, onAdvanced }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isFinal =
    order.fulfillmentStatus === FULFILLMENT_SEQUENCE[FULFILLMENT_SEQUENCE.length - 1];

  const handleAdvance = async () => {
    setLoading(true);
    setError("");
    try {
      const updated = await advanceFulfillmentStatus(order._id);
      onAdvanced(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-gray-100 border-t-4 ${BORDER_COLORS[order.fulfillmentStatus]} flex flex-col overflow-hidden`}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Order
          </p>
          <p className="text-2xl font-extrabold text-gray-900 leading-none">
            #{order.orderNo}
          </p>
          <p className="text-xs text-gray-400 mt-1">{order.time}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${FULFILLMENT_COLORS[order.fulfillmentStatus]}`}
        >
          {FULFILLMENT_LABELS[order.fulfillmentStatus]}
        </span>
      </div>

      {/* ── Items ── */}
      <div className="px-5 pb-3 flex-1">
        <div className="divide-y divide-gray-50">
          {order.itemsCart.map((item, i) => (
            <div
              key={`${item.itemId}-${i}`}
              className="py-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {item.qty}
                </span>
                <span className="text-sm font-medium text-gray-800">{item.name}</span>
              </div>
              <span className="text-xs text-gray-400 ml-2">
                ₹{(item.price * item.qty).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 pb-5 border-t border-gray-50 pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-sm font-bold text-gray-800">
            ₹{order.totalAmount.toFixed(0)}
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}

        {!isFinal && (
          <button
            onClick={handleAdvance}
            disabled={loading}
            className="w-full py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Updating…
              </span>
            ) : (
              FULFILLMENT_NEXT_ACTION[order.fulfillmentStatus]
            )}
          </button>
        )}
      </div>
    </div>
  );
}
