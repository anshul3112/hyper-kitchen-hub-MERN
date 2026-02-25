const BASE_URL = "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Types ──────────────────────────────────────────────────────────────────

export type FulfillmentStatus =
  | "created"
  | "received"
  | "cooking"
  | "prepared"
  | "served";

export type KitchenOrderItem = {
  itemId: string;
  name: string;
  qty: number;
  price: number;
};

export type KitchenOrder = {
  _id: string;
  orderNo: number;
  name?: string;
  time: string;
  itemsCart: KitchenOrderItem[];
  totalAmount: number;
  outletId: string;
  tenantId: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: string;
  updatedAt: string;
};

// Payload emitted over socket for order:status events
export type OrderStatusPayload = {
  orderId: string;
  orderNo?: number;
  fulfillmentStatus?: FulfillmentStatus;
  orderStatus?: string;
  paymentStatus?: string;
};

// ── API calls ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/kitchen/orders
 * Returns all Completed orders with fulfillmentStatus !== "served".
 */
export async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const res = await fetch(`${BASE_URL}/kitchen/orders`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to fetch kitchen orders");
  }
  const json = await res.json();
  return json.data as KitchenOrder[];
}

/**
 * PATCH /api/v1/kitchen/orders/:orderId/status
 * Advances the fulfillmentStatus one step forward.
 * Returns the updated order.
 */
export async function advanceFulfillmentStatus(orderId: string): Promise<KitchenOrder> {
  const res = await fetch(`${BASE_URL}/kitchen/orders/${orderId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to advance order status");
  }
  const json = await res.json();
  return json.data as KitchenOrder;
}

// ── Fulfillment helpers ────────────────────────────────────────────────────

export const FULFILLMENT_SEQUENCE: FulfillmentStatus[] = [
  "created",
  "received",
  "cooking",
  "prepared",
  "served",
];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  created: "New",
  received: "Received",
  cooking: "Cooking",
  prepared: "Ready",
  served: "Served",
};

export const FULFILLMENT_NEXT_ACTION: Record<FulfillmentStatus, string> = {
  created: "Mark Received",
  received: "Start Cooking",
  cooking: "Mark Ready",
  prepared: "Mark Served",
  served: "",
};

export const FULFILLMENT_COLORS: Record<FulfillmentStatus, string> = {
  created: "bg-blue-100 text-blue-700",
  received: "bg-yellow-100 text-yellow-700",
  cooking: "bg-orange-100 text-orange-700",
  prepared: "bg-green-100 text-green-700",
  served: "bg-gray-100 text-gray-500",
};
