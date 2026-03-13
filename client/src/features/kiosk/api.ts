export const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

// ── Menu types ────────────────────────────────────────────────────────────────

/** A field that stores text in multiple languages. `en` is always required. */
export type MultiLangString = { en: string; [langCode: string]: string };

export type MenuCategory = {
  _id: string;
  name: MultiLangString;
  status: boolean;
  imageUrl?: string;
};

export type MenuFilter = {
  _id: string;
  name: MultiLangString;
  isActive: boolean;
  imageUrl?: string;
};

export type MenuItem = {
  _id: string;
  name: MultiLangString;
  description?: MultiLangString;
  defaultAmount: number;
  status: boolean;
  imageUrl?: string;
  category: MenuCategory | null;
  filters: MenuFilter[];
  /** 'single' = standard item; 'combo' = a meal that bundles other items */
  type?: 'single' | 'combo';
  /** Items that form this combo with their required quantities (only used when type = 'combo') */
  comboItems?: { item: string; quantity: number }[];
  /** Minimum number of comboItems that must be in the cart to trigger an upgrade suggestion */
  minMatchCount?: number;
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
  /** Outlet-level enable/disable for this item */
  status: boolean;
  /** Controls which order-type this item is available for at this outlet */
  orderType: 'dineIn' | 'takeAway' | 'both';
  /**
   * Schedule-resolved effective price at the time the inventory was fetched.
   * null → use inventory.price (outlet override) or item.defaultAmount as fallback.
   */
  activePrice?: number | null;
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
  /** Controls which order-type this item is available for; defaults to 'both' */
  orderType: 'dineIn' | 'takeAway' | 'both';
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

// ── Order types ───────────────────────────────────────────────────────────────

export type PlaceOrderPayload = {
  items: CartItem[];
  totalAmount: number;
  paymentDetails: {
    name: string;
    upiId: string;
  };
};

export type OrderResult = {
  _id: string;
  orderNo: number;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
};

// ── API functions ─────────────────────────────────────────────────────────────

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
    // Resolution order: schedule-resolved activePrice → outlet price override → item default
    const displayPrice =
      (rec?.activePrice != null ? rec.activePrice : null) ??
      (rec?.price != null ? rec.price : null) ??
      item.defaultAmount;
    const orderType: 'dineIn' | 'takeAway' | 'both' = rec?.orderType ?? 'both';

    // Combos have no independent inventory — their stock is limited by whichever
    // component item runs out first, accounting for how many of each are required
    // per combo unit (e.g. if a combo needs 2× Bread, available combos = floor(breadQty / 2)).
    let stockQuantity: number;
    if (item.type === 'combo' && item.comboItems && item.comboItems.length > 0) {
      stockQuantity = item.comboItems.reduce((min, ci) => {
        const compRec = invMap.get(ci.item);
        const available = compRec ? Math.floor(compRec.quantity / ci.quantity) : 0;
        return Math.min(min, available);
      }, Infinity);
      if (!isFinite(stockQuantity)) stockQuantity = 0;
    } else {
      stockQuantity = rec ? rec.quantity : 0;
    }

    return {
      ...item,
      displayPrice,
      stockQuantity,
      inStock: stockQuantity > 0,
      orderType,
    };
  });
}

// ── Place order ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/orders
 * Enqueues the order for async processing via SQS FIFO (HTTP 202).
 * Returns { orderId } — a correlation UUID the kiosk uses to listen
 * for the matching "order:confirmed" / "order:failed" WebSocket events.
 */
export async function placeOrder(payload: PlaceOrderPayload): Promise<{ orderId: string }> {
  const session = getKioskSession();
  if (!session) throw new Error("Kiosk session not found. Please log in again.");

  const res = await fetch(`${API_BASE_URL}/api/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(payload),
  });

  const parsed = await parseOrThrow<{ data: { orderId: string } }>(res);
  return parsed.data;
}

// ── Kiosk languages ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/kiosks/languages
 * Returns the additional kiosk languages configured for this kiosk's tenant.
 * English is always available; this returns only the extra enabled languages.
 */
export async function fetchKioskLanguages(): Promise<string[]> {
  const token = localStorage.getItem("kioskToken");
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/languages`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  const parsed = await parseOrThrow<{ data: { kioskLanguages: string[] } }>(res);
  return parsed.data.kioskLanguages;
}

// ── Kiosk recommendations ─────────────────────────────────────────────────────

/** A single recommended item reference returned by the recommendations API. */
export type RecommendedItemRef = {
  itemId: string;
  priority: number;
};

/**
 * GET /api/v1/kiosks/recommendations
 * Returns merged weighted recommendations for the kiosk's outlet using
 * admin-configured slots and outlet-hour historical frequency, filtered for
 * availability and sorted by priority (descending).
 * Returns [] when the outlet has no available recommendations.
 */
export async function fetchRecommendations(): Promise<RecommendedItemRef[]> {
  const token = localStorage.getItem("kioskToken");
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/recommendations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  const parsed = await parseOrThrow<{ data: RecommendedItemRef[] }>(res);
  return parsed.data;
}
