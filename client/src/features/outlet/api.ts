export type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export type KioskStatus = "ACTIVE" | "OFFLINE" | "MAINTENANCE" | "DISABLED";

export type Kiosk = {
  _id: string;
  code: string;
  number: number;
  status: KioskStatus;
  isActive: boolean;
  lastLoginAt?: string;
  lastHeartbeatAt?: string;
  lastSyncAt?: string;
  outlet: { outletId: string; outletName: string };
  tenant: { tenantId: string; tenantName: string };
  role: string;
  createdAt?: string;
  updatedAt?: string;
  loginCode?: string;
  loginCodeExpiresAt?: string;
};

export type MultiLangString = { en: string; [langCode: string]: string };

export type MenuCategory = {
  _id: string;
  name: MultiLangString;
  status: boolean;
  imageUrl?: string;
  createdAt?: string;
};

export type MenuFilter = {
  _id: string;
  name: MultiLangString;
  isActive: boolean;
  imageUrl?: string;
  createdAt?: string;
};

export type MenuItem = {
  _id: string;
  name: MultiLangString;
  description?: MultiLangString;
  defaultAmount: number;
  status: boolean;
  imageUrl?: string;
  tenantId: string;
  category: MenuCategory | null;
  filters: MenuFilter[];
  /** 'single' = standard item; 'combo' = derived stock from components */
  type?: 'single' | 'combo';
  /** Component items with required quantities (only present when type = 'combo') */
  comboItems?: { item: string; quantity: number }[];
  createdAt?: string;
  updatedAt?: string;
};

export type MenuDetails = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: MenuItem[];
  summary: {
    totalCategories: number;
    totalFilters: number;
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
  };
};

const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

// ── Kiosk APIs ────────────────────────────────────────────────────────────────

export async function fetchKiosks(): Promise<Kiosk[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<Kiosk[]>>(res);
  return parsed.data;
}

export async function createKiosk(): Promise<Kiosk> {
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/create`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  });
  const parsed = await parseOrThrow<ApiResponse<Kiosk>>(res);
  return parsed.data;
}

export async function toggleKiosk(id: string): Promise<Kiosk> {
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/${id}/toggle`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<Kiosk>>(res);
  return parsed.data;
}

// ── Inventory types ──────────────────────────────────────────────────────────────────

export type PrioritySlot = {
  _id?: string;
  startDate: string;   // ISO date string
  endDate: string;     // ISO date string
  startTime: number;   // minutes 0–1440
  endTime: number;     // minutes 0–1440
  price: number;
};

export type PriceSlot = {
  _id?: string;
  days: number[];      // 0 (Sun) – 6 (Sat); use [0,1,2,3,4,5,6] for every day
  startTime: number;   // minutes 0–1440
  endTime: number;     // minutes 0–1440; must be > startTime
  price: number;
};

export type AvailabilitySlot = {
  _id?: string;
  days: number[];      // 0 (Sun) – 6 (Sat)
  startTime: number;   // minutes 0–1440
  endTime: number;     // minutes 0–1440; must be > startTime
};

export type ScheduleSlotType =
  | 'prioritySlots'
  | 'priceSlots'
  | 'availabilitySlots';

export type InventoryRecord = {
  _id: string;
  itemId: string;
  outletId: string;
  price: number;
  quantity: number;
  /** outlet-level enable/disable flag — defaults to true */
  status: boolean;
  /** Controls which order-type this item is available for; defaults to 'both' */
  orderType: 'dineIn' | 'takeAway' | 'both';
  /** Alert fires when quantity drops to or below this value; null means disabled */
  lowStockThreshold: number | null;
  /** Estimated minutes kitchen needs to prepare this item; 0 = instant/packaged */
  prepTime: number;
  /** Schedule slot arrays */
  prioritySlots: PrioritySlot[];
  priceSlots: PriceSlot[];
  availabilitySlots: AvailabilitySlot[];
  editedBy: string;
  createdAt?: string;
  updatedAt?: string;
};

// ── Inventory APIs ──────────────────────────────────────────────────────────────────

/** GET all inventory records for the caller's outlet (price + qty per item) */
export async function fetchOutletInventory(): Promise<InventoryRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord[]>>(res);
  return parsed.data;
}

/** PUT: create or fully replace inventory entry (price + quantity) for one item */
export async function upsertInventoryItem(
  itemId: string,
  price: number,
  quantity: number
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ price, quantity }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: change price only for an item */
export async function updateInventoryPrice(
  itemId: string,
  price: number
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/price`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ price }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: change quantity only for an item */
export async function updateInventoryQuantity(
  itemId: string,
  quantity: number
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/quantity`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: toggle outlet-level status (enable/disable) for an item */
export async function toggleInventoryStatus(
  itemId: string,
  status: boolean
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: set order type (dineIn / takeAway / both) for an item at this outlet */
export async function updateInventoryOrderType(
  itemId: string,
  orderType: 'dineIn' | 'takeAway' | 'both'
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/orderType`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ orderType }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: set (or clear) the low-stock alert threshold for an item.
 *  Pass null to disable alerts for this item. */
export async function updateInventoryThreshold(
  itemId: string,
  lowStockThreshold: number | null
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/threshold`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ lowStockThreshold }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: set estimated prep time (minutes) for an item; 0 = instant/packaged */
export async function updateInventoryPrepTime(
  itemId: string,
  prepTime: number
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/preptime`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ prepTime }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

/** PATCH: replace the full slot array for one schedule slot type */
export async function updateInventorySchedule(
  itemId: string,
  type: ScheduleSlotType,
  slots: PrioritySlot[] | PriceSlot[] | AvailabilitySlot[]
): Promise<InventoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/inventory/${itemId}/schedule`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ type, slots }),
  });
  const parsed = await parseOrThrow<ApiResponse<InventoryRecord>>(res);
  return parsed.data;
}

// ── Menu API ──────────────────────────────────────────────────────────────────

export async function fetchMenuDetails(): Promise<MenuDetails> {
  const res = await fetch(`${API_BASE_URL}/api/v1/items/menu/all`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<MenuDetails>>(res);
  return parsed.data;
}

// ── Outlet Staff types ─────────────────────────────────────────────────────────

export type OutletStaffRole = "kitchenStaff" | "billingStaff";

export type OutletStaffMember = {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: OutletStaffRole;
  status: boolean;
  outlet: { outletId: string; outletName: string };
  tenant: { tenantId: string; tenantName: string };
  createdAt?: string;
};

export type CreateOutletStaffInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: OutletStaffRole;
};

// ── Outlet Staff APIs ─────────────────────────────────────────────────────────

/** GET all kitchenStaff + billingStaff for the logged-in outlet admin's outlet */
export async function fetchOutletStaff(): Promise<OutletStaffMember[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/users/outlet-staff`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<OutletStaffMember[]>>(res);
  return parsed.data;
}

/** POST create a new kitchenStaff or billingStaff for the caller's outlet */
export async function createOutletStaff(
  input: CreateOutletStaffInput
): Promise<OutletStaffMember> {
  const res = await fetch(`${API_BASE_URL}/api/v1/users/create-outlet-staff`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });
  const parsed = await parseOrThrow<ApiResponse<OutletStaffMember>>(res);
  return parsed.data;
}

// ── Display Device types ──────────────────────────────────────────────────────

export type DisplayDevice = {
  _id: string;
  number: number;
  isActive: boolean;
  outlet: { outletId: string; outletName: string };
  tenant: { tenantId: string; tenantName: string };
  loginCode?: string | null;
  loginCodeExpiresAt?: string | null;
  lastLoginAt?: string;
  createdAt?: string;
};

// ── Display Device APIs ───────────────────────────────────────────────────────

/** POST /api/v1/displays/create — create a new display screen device */
export async function createDisplay(): Promise<DisplayDevice> {
  const res = await fetch(`${API_BASE_URL}/api/v1/displays/create`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
  });
  const parsed = await parseOrThrow<ApiResponse<DisplayDevice>>(res);
  return parsed.data;
}

/** GET /api/v1/displays — list display devices for caller's outlet */
export async function fetchDisplays(): Promise<DisplayDevice[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/displays`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<DisplayDevice[]>>(res);
  return parsed.data;
}

/** PATCH /api/v1/displays/:id/toggle — enable or disable a display device */
export async function toggleDisplay(id: string): Promise<DisplayDevice> {
  const res = await fetch(`${API_BASE_URL}/api/v1/displays/${id}/toggle`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<DisplayDevice>>(res);
  return parsed.data;
}

// ── Order History types & API ─────────────────────────────────────────────────

export type CursorPagination = {
  nextCursor: string | null;
  prevCursor: string | null;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type OrderHistoryItem = {
  _id: string;
  orderNo: number;
  name: string;
  totalAmount: number;
  orderStatus: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  date: string;
  outlet: { outletId: string; outletName: string };
};

export type HourlyPoint = {
  hour: number;
  orders: number;
  revenue: number;
  completed: number;
};

/** GET /api/v1/analytics/outlet-orders */
export async function fetchOutletOrderHistory(params: {
  cursor?: string;
  prevCursor?: string;
  perPage ?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ orders: OrderHistoryItem[]; pagination: CursorPagination }> {
  const q = new URLSearchParams();
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.prevCursor) q.set("prevCursor", params.prevCursor);
  q.set("perPage", String(params.perPage ?? 10));
  if (params.status) q.set("status", params.status);
  if (params.startDate) q.set("startDate", params.startDate);
  if (params.endDate) q.set("endDate", params.endDate);
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/outlet-orders?${q}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<{ orders: OrderHistoryItem[]; pagination: CursorPagination }>>(res);
  return parsed.data;
}

/** GET /api/v1/analytics/hourly */
export async function fetchOutletHourlyHistory(date?: string): Promise<{ date: string; hourly: HourlyPoint[] }> {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/hourly?${q}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const parsed = await parseOrThrow<ApiResponse<{ date: string; hourly: HourlyPoint[] }>>(res);
  return parsed.data;
}

