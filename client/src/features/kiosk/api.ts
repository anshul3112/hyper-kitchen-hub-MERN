const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

// ── Menu types ────────────────────────────────────────────────────────────────

export type MenuCategory = {
  _id: string;
  name: string;
  status: boolean;
  imageUrl?: string;
};

export type MenuFilter = {
  _id: string;
  name: string;
  isActive: boolean;
  imageUrl?: string;
};

export type MenuItem = {
  _id: string;
  name: string;
  description?: string;
  defaultAmount: number;
  status: boolean;
  imageUrl?: string;
  categories: MenuCategory[];
  filters: MenuFilter[];
};

export type KioskMenu = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: MenuItem[];
};

// ── Inventory types ───────────────────────────────────────────────────────────

export type InventoryItem = {
  _id: string;
  itemId: string;
  price: number;
  quantity: number;
  outletId: string;
};

/**
 * A MenuItem enriched with outlet-specific price and stock quantity.
 * - displayPrice: inventory price if set, otherwise item's defaultAmount
 * - stockQuantity: inventory quantity (0 = out of stock)
 * - inStock: true when stockQuantity > 0
 */
export type EnrichedMenuItem = MenuItem & {
  displayPrice: number;
  stockQuantity: number;
  inStock: boolean;
};

/**
 * A single entry in the kiosk cart.
 * The map key is item._id; this record holds all details needed for display and order submission.
 */
export type CartItem = {
  id: string;
  name: string;
  price: number;       // displayPrice at the time it was added
  quantity: number;
};

export type KioskSession = {
  token: string;
  kiosk: {
    _id: string;
    number: number;
    status: string;
    outlet: { outletId: string; outletName: string };
    tenant: { tenantId: string; tenantName: string };
  };
};

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export async function kioskLogin(loginCode: string): Promise<KioskSession> {
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginCode }),
  });
  const parsed = await parseOrThrow<{ data: KioskSession }>(res);
  return parsed.data;
}

export function saveKioskSession(session: KioskSession) {
  localStorage.setItem("kioskToken", session.token);
  localStorage.setItem("kioskData", JSON.stringify(session.kiosk));
}

export function getKioskSession(): KioskSession | null {
  const token = localStorage.getItem("kioskToken");
  const kiosk = localStorage.getItem("kioskData");
  if (!token || !kiosk) return null;
  return { token, kiosk: JSON.parse(kiosk) };
}

export function clearKioskSession() {
  localStorage.removeItem("kioskToken");
  localStorage.removeItem("kioskData");
}

// ── Kiosk menu ─────────────────────────────────────────────────────────────

export async function fetchKioskMenu(): Promise<KioskMenu> {
  const token = localStorage.getItem("kioskToken");
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/menu`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  const parsed = await parseOrThrow<{ data: KioskMenu }>(res);
  return parsed.data;
}

// ── Kiosk inventory ───────────────────────────────────────────────────────────

export async function fetchKioskInventory(): Promise<InventoryItem[]> {
  const token = localStorage.getItem("kioskToken");
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/inventory`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  const parsed = await parseOrThrow<{ data: InventoryItem[] }>(res);
  return parsed.data;
}

/**
 * Merge menu items with inventory records.
 * - If inventory record exists → use its price, use its quantity
 * - If no record for an item  → use item.defaultAmount as price, quantity = 0 (out of stock)
 */
export function mergeMenuWithInventory(
  items: MenuItem[],
  inventory: InventoryItem[]
): EnrichedMenuItem[] {
  const invMap = new Map<string, InventoryItem>();
  inventory.forEach((rec) => invMap.set(rec.itemId, rec));

  return items.map((item) => {
    const rec = invMap.get(item._id);
    const displayPrice = rec && rec.price != null ? rec.price : item.defaultAmount;
    const stockQuantity = rec ? rec.quantity : 0;
    return {
      ...item,
      displayPrice,
      stockQuantity,
      inStock: stockQuantity > 0,
    };
  });
}
