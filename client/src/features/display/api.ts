const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FulfillmentStatus = "created" | "received" | "cooking" | "prepared" | "served";

export type DisplayOrder = {
  _id: string;
  orderNo: number;
  name?: string;
  fulfillmentStatus: FulfillmentStatus;
  time?: string;
  totalAmount: number;
  itemsCart: { itemId: string; name: string; qty: number; price: number }[];
  createdAt?: string;
};

export type DisplaySession = {
  token: string;
  display: {
    _id: string;
    number: number;
    outlet: { outletId: string; outletName: string };
    tenant: { tenantId: string; tenantName: string };
  };
};

export type OrderStatusPayload = {
  orderId: string;
  orderNo?: number;
  fulfillmentStatus?: FulfillmentStatus;
  orderStatus?: string;
  paymentStatus?: string;
};

// ── Status helpers (same values as kitchen) ───────────────────────────────────

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  created: "Order Placed",
  received: "Received",
  cooking: "Cooking",
  prepared: "Ready!",
  served: "Served",
};

export const FULFILLMENT_COLORS: Record<FulfillmentStatus, string> = {
  created: "bg-blue-100 text-blue-700",
  received: "bg-yellow-100 text-yellow-700",
  cooking: "bg-orange-100 text-orange-700",
  prepared: "bg-green-100 text-green-700",
  served: "bg-gray-100 text-gray-400",
};

// ── Session helpers ───────────────────────────────────────────────────────────

export function saveDisplaySession(session: DisplaySession): void {
  localStorage.setItem("displayToken", session.token);
  localStorage.setItem("displayOutletId", session.display.outlet.outletId);
  localStorage.setItem("displayOutletName", session.display.outlet.outletName);
  localStorage.setItem("displayNumber", String(session.display.number));
}

export function getDisplayToken(): string {
  return localStorage.getItem("displayToken") ?? "";
}

// ── API helpers ───────────────────────────────────────────────────────────────

function displayAuthHeaders() {
  const token = getDisplayToken();
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data?.message ?? data?.error) || res.statusText || "Request failed");
  }
  return data as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** POST /api/v1/displays/login  — public, no auth */
export async function displayLogin(loginCode: string): Promise<DisplaySession> {
  const res = await fetch(`${API_BASE_URL}/api/v1/displays/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginCode }),
  });
  const parsed = await parseOrThrow<{ data: DisplaySession }>(res);
  return parsed.data;
}

/** GET /api/v1/displays/orders  — requires display token */
export async function fetchDisplayOrders(): Promise<DisplayOrder[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/displays/orders`, {
    method: "GET",
    credentials: "include",
    headers: displayAuthHeaders(),
  });
  const parsed = await parseOrThrow<{ data: DisplayOrder[] }>(res);
  return parsed.data;
}
