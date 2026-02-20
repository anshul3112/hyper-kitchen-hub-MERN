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
};

export type MenuCategory = {
  _id: string;
  name: string;
  status: boolean;
  imageUrl?: string;
  createdAt?: string;
};

export type MenuFilter = {
  _id: string;
  name: string;
  isActive: boolean;
  imageUrl?: string;
  createdAt?: string;
};

export type MenuItem = {
  _id: string;
  name: string;
  description?: string;
  defaultAmount: number;
  status: boolean;
  imageUrl?: string;
  tenantId: string;
  categories: MenuCategory[];
  filters: MenuFilter[];
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

export async function createKiosk(number: number): Promise<Kiosk> {
  const res = await fetch(`${API_BASE_URL}/api/v1/kiosks/create`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ number }),
  });
  const parsed = await parseOrThrow<ApiResponse<Kiosk>>(res);
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
