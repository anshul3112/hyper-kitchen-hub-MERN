
export type ApiResponse<T> = {
	data: T;
	message?: string;
	success?: boolean;
};

export type Tenant = {
	_id: string;
	name: string;
	status: boolean;
	address: string;
	createdAt: string;
	updatedAt: string;
};

export type CreateTenantInput = {
	name: string;
	email?: string;
	phone?: string;
	address: string;
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

async function parseOrThrow(res: Response) {
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
		throw new Error(msg);
	}
	return data;
}

export async function fetchTenants(): Promise<ApiResponse<Tenant[]>> {
	const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	return parseOrThrow(res);
}

export type CreateTenantAdminInput = {
	name: string;
	email: string;
	password: string;
	phoneNumber: string;
	tenant: { tenantId: string; tenantName: string };
};

export type TenantAdmin = {
	_id: string;
	name: string;
	email: string;
	role: string;
	tenant: { tenantId: string; tenantName: string };
	phoneNumber?: string;
	status: boolean;
	createdAt: string;
};

export async function createTenantAdmin(payload: CreateTenantAdminInput): Promise<TenantAdmin> {
	const res = await fetch(`${API_BASE_URL}/api/v1/users/create-tenant-admin`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<TenantAdmin>;
	return parsed.data;
}

export async function createTenant(payload: CreateTenantInput): Promise<Tenant> {
	const res = await fetch(`${API_BASE_URL}/api/v1/tenants/create-tenant`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify({
			name: payload.name,
			contacts: {
				email: payload.email,
				phoneNumber: payload.phone,
			},
			address: payload.address,
		}),
	});

	const parsed = (await parseOrThrow(res)) as ApiResponse<Tenant>;
	return parsed.data;
}

// ─── Extended Types ──────────────────────────────────────────────────────────

export type CursorPagination = {
	nextCursor: string | null;
	prevCursor: string | null;
	perPage: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
};

export type RevenueTrendPoint = {
	date: string;
	revenue: number;
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
	itemsCart: { itemId: string; name: string; qty: number; price: number }[];
  tenant: { tenantId: string; tenantName: string };
  outlet: { outletId: string; outletName: string };
  /** Flat convenience fields added by the analytics controller */
  tenantName: string;
	outletName?: string;
};

export type AnalyticsOverview = {
	orders: {
		totalOrders: number;
		totalRevenue: number;
		completedOrders: number;
		pendingOrders: number;
		failedOrders: number;
	};
	tenants: { totalTenants: number; activeTenants: number; inactiveTenants: number };
	users: { totalUsers: number; byRole: { role: string; count: number }[] };
	revenueTrend: RevenueTrendPoint[];
	revenueByTenant: { tenantId: string; tenantName: string; revenue: number; orders: number }[];
	recentOrders: OrderHistoryItem[];
};

export type UserRecord = {
	_id: string;
	name: string;
	email: string;
	role: string;
	status: boolean;
	phoneNumber?: string;
	tenant?: { tenantId: string; tenantName: string };
	outlet?: { outletId: string; outletName: string };
	createdAt: string;
};

export type TenantDetails = {
	tenant: Tenant & { contacts?: { email?: string; phoneNumber?: string } };
	users: UserRecord[];
	orderStats: {
		totalOrders: number;
		totalRevenue: number;
		completedOrders: number;
		pendingOrders: number;
	};
};

// ─── Analytics API ───────────────────────────────────────────────────────────

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
	const res = await fetch(`${API_BASE_URL}/api/v1/analytics/overview`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<AnalyticsOverview>;
	return parsed.data;
}

export async function fetchOrderHistory(params: {
	cursor?: string;
	prevCursor?: string;
	perPage?: number;
	tenantId?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
}): Promise<{ orders: OrderHistoryItem[]; pagination: CursorPagination }> {
	const q = new URLSearchParams();
	if (params.cursor) q.set("cursor", params.cursor);
	if (params.prevCursor) q.set("prevCursor", params.prevCursor);
	q.set("perPage", String(params.perPage ?? 10));
	if (params.tenantId) q.set("tenantId", params.tenantId);
	if (params.status) q.set("status", params.status);
	if (params.startDate) q.set("startDate", params.startDate);
	if (params.endDate) q.set("endDate", params.endDate);
	const res = await fetch(`${API_BASE_URL}/api/v1/analytics/orders?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

export async function fetchRevenueTrends(
	days = 30,
	tenantId?: string
): Promise<{ trends: RevenueTrendPoint[] }> {
	const q = new URLSearchParams({ days: String(days) });
	if (tenantId) q.set("tenantId", tenantId);
	const res = await fetch(`${API_BASE_URL}/api/v1/analytics/revenue-trends?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

// ─── Tenant Management API ───────────────────────────────────────────────────

export async function toggleTenantStatus(tenantId: string): Promise<Tenant> {
	const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/toggle-status`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data.tenant;
}

export async function fetchTenantDetails(tenantId: string): Promise<TenantDetails> {
	const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/details`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

// ─── User Management API ─────────────────────────────────────────────────────

export async function fetchAllUsers(params: {
	cursor?: string;
	prevCursor?: string;
	perPage?: number;
	role?: string;
	tenantId?: string;
	search?: string;
}): Promise<{ users: UserRecord[]; pagination: CursorPagination }> {
	const q = new URLSearchParams();
	if (params.cursor) q.set("cursor", params.cursor);
	if (params.prevCursor) q.set("prevCursor", params.prevCursor);
	q.set("perPage", String(params.perPage ?? 10));
	if (params.role) q.set("role", params.role);
	if (params.tenantId) q.set("tenantId", params.tenantId);
	if (params.search) q.set("search", params.search);
	const res = await fetch(`${API_BASE_URL}/api/v1/users/all?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

export async function toggleUserStatus(
	userId: string
): Promise<{ _id: string; name: string; status: boolean }> {
	const res = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/toggle-status`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data.user;
}
