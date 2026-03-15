import { compressImage } from "../../common/utils/compressImage";

// re-export so components can import compressImage from a single place
export { compressImage };

export type ApiResponse<T> = {
	data: T;
	message?: string;
	success?: boolean;
};

export type Outlet = {
	_id: string;
	name: string;
	address?: string;
	status: boolean;
	imageUrl?: string;
	contacts?: {
		email?: string;
		phoneNumber?: string;
	};
	createdAt?: string;
	updatedAt?: string;
	tenant?: {
		tenantId: string;
		tenantName: string;
	};
};

export type CreateOutletInput = {
	name: string;
	address: string;
	imageUrl?: string;
	contacts?: {
		email?: string;
		phoneNumber?: string;
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

async function parseOrThrow(res: Response) {
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
		throw new Error(msg);
	}
	return data;
}

export async function fetchOutlets(): Promise<ApiResponse<Outlet[]>> {
	const res = await fetch(`${API_BASE_URL}/api/v1/outlets`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	return parseOrThrow(res);
}

export async function createOutlet(payload: CreateOutletInput): Promise<Outlet> {
	const res = await fetch(`${API_BASE_URL}/api/v1/outlets`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<Outlet>;
	return parsed.data;
}

export async function toggleOutletStatus(outletId: string): Promise<Outlet> {
	const res = await fetch(`${API_BASE_URL}/api/v1/outlets/${outletId}/toggle`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<Outlet>;
	return parsed.data;
}

// ── Outlet Admin ─────────────────────────────────────────────────────────────

export type OutletAdmin = {
	_id: string;
	name: string;
	email: string;
	role: string;
	phoneNumber?: string;
	status: boolean;
	outlet: { outletId: string; outletName: string };
	tenant: { tenantId: string; tenantName: string };
	createdAt: string;
};

export type CreateOutletAdminInput = {
	name: string;
	email: string;
	password: string;
	phoneNumber: string;
	outlet: { outletId: string; outletName: string };
};

export async function createOutletAdmin(payload: CreateOutletAdminInput): Promise<OutletAdmin> {
	const res = await fetch(`${API_BASE_URL}/api/v1/users/create-outlet-admin`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<OutletAdmin>;
	return parsed.data;
}

// ── Menu types ──────────────────────────────────────────────────────────────

/** A field that stores text in multiple languages. `en` is always required. */
export type MultiLangString = { en: string; [langCode: string]: string };

export type MenuFilter = {
	_id: string;
	name: MultiLangString;
	imageUrl?: string | null;
	isActive: boolean;
	tenantId: string;
	createdAt?: string;
	updatedAt?: string;
};

export type MenuCategory = {
	_id: string;
	name: MultiLangString;
	imageUrl?: string | null;
	status: boolean;
	tenantId: string;
	createdAt?: string;
	updatedAt?: string;
};

export type MenuItemCategory = { _id: string; name: MultiLangString; status: boolean };
export type MenuItemFilter = { _id: string; name: MultiLangString; isActive: boolean };

export type MenuItem = {
	_id: string;
	name: MultiLangString;
	description?: MultiLangString;
	defaultAmount: number;
	imageUrl?: string | null;
	status: boolean;
	tenantId: string;
	category: MenuItemCategory | null;
	filters: MenuItemFilter[];
	/** 'single' = standard item; 'combo' = a meal that bundles other items */
	type?: 'single' | 'combo';
	/** Items that form this combo with their required quantities (only used when type = 'combo') */
	comboItems?: { item: string; quantity: number }[];
	/** Minimum number of comboItems that must be in the cart to trigger an upgrade suggestion */
	minMatchCount?: number;
	createdAt?: string;
	updatedAt?: string;
};

// ── Filter API ───────────────────────────────────────────────────────────────

export async function fetchFilters(): Promise<MenuFilter[]> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/filters`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuFilter[]>;
	return parsed.data;
}

export async function createFilter(payload: { name: MultiLangString; imageUrl?: string }): Promise<MenuFilter> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/filters`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuFilter>;
	return parsed.data;
}

export async function updateFilter(
	filterId: string,
	payload: { name?: MultiLangString; imageUrl?: string; isActive?: boolean },
): Promise<MenuFilter> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/filters/${filterId}`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuFilter>;
	return parsed.data;
}

export async function deleteFilter(filterId: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/filters/${filterId}`, {
		method: "DELETE",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	await parseOrThrow(res);
}

// ── Category API ─────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<MenuCategory[]> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/categories`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuCategory[]>;
	return parsed.data;
}

export async function createCategory(payload: { name: MultiLangString; imageUrl?: string }): Promise<MenuCategory> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/categories`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuCategory>;
	return parsed.data;
}

export async function updateCategory(
	categoryId: string,
	payload: { name?: MultiLangString; imageUrl?: string; status?: boolean },
): Promise<MenuCategory> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/categories/${categoryId}`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuCategory>;
	return parsed.data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/categories/${categoryId}`, {
		method: "DELETE",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	await parseOrThrow(res);
}

// ── Item API ─────────────────────────────────────────────────────────────────

export type CreateItemInput = {
	name: MultiLangString;
	description?: MultiLangString;
	defaultAmount: number;
	imageUrl?: string;
	category: string;
	filters?: string[];
	type?: 'single' | 'combo';
	comboItems?: { item: string; quantity: number }[];
	minMatchCount?: number;
};

export type UpdateItemInput = Partial<CreateItemInput> & { status?: boolean };

export async function fetchItems(): Promise<MenuItem[]> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuItem[]>;
	return parsed.data;
}

export async function createItem(payload: CreateItemInput): Promise<MenuItem> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items`, {
		method: "POST",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuItem>;
	return parsed.data;
}

export async function updateItem(itemId: string, payload: UpdateItemInput): Promise<MenuItem> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/${itemId}`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify(payload),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<MenuItem>;
	return parsed.data;
}

export async function deleteItem(itemId: string): Promise<void> {
	const res = await fetch(`${API_BASE_URL}/api/v1/items/${itemId}`, {
		method: "DELETE",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	await parseOrThrow(res);
}

/**
 * Upload a pre-compressed image file using the presigned S3 URL flow.
 *
 * The file itself never touches the backend server:
 *   1. Tell the backend the mimetype → backend returns a short-lived (60 s)
 *      presigned PUT URL and the S3 key.
 *   2. PUT the file bytes straight to S3 using that URL.
 *   3. Return the S3 key (imageUrl) so the caller can save it with the item.
 *
 * Compression must be done by the caller before invoking this function
 * (use compressImage() from common/utils/compressImage).
 */
export async function uploadItemImage(file: File, folder = "items"): Promise<string> {
	// Step 1 — ask backend for a presigned PUT URL (send only metadata, not the file)
	const params = new URLSearchParams({
		mimetype: file.type,
		folder,
		filename: file.name,
		size: String(file.size),
	});
	const res = await fetch(`${API_BASE_URL}/api/v1/items/upload-url?${params}`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<{ uploadUrl: string; imageUrl: string }>;
	const { uploadUrl, imageUrl } = parsed.data;

	// Step 2 — PUT the file bytes directly to S3 (no auth header — URL is already signed)
	const s3Res = await fetch(uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": file.type },
		body: file,
	});
	if (!s3Res.ok) {
		throw new Error(`S3 upload failed: ${s3Res.status} ${s3Res.statusText}`);
	}

	// Step 3 — return the S3 key; caller saves it as imageUrl on the item
	return imageUrl;
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
	tenant: { tenantId: string; tenantName: string };
	outlet: { outletId: string; outletName: string };
	/** Flat convenience field added by the analytics controller */
	outletName: string;
	itemsCart?: { itemId?: string; name: string; qty: number; price: number }[];
};

export type HourlyPoint = {
	hour: number;
	orders: number;
	revenue: number;
	completed: number;
};

export type TenantUserRecord = {
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

/** GET /api/v1/analytics/tenant-orders */
export async function fetchTenantOrderHistory(params: {
	cursor?: string;
	prevCursor?: string;
	perPage?: number;
	outletId?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
}): Promise<{ orders: OrderHistoryItem[]; pagination: CursorPagination }> {
	const q = new URLSearchParams();
	if (params.cursor) q.set("cursor", params.cursor);
	if (params.prevCursor) q.set("prevCursor", params.prevCursor);
	q.set("perPage", String(params.perPage ?? 10));
	if (params.outletId) q.set("outletId", params.outletId);
	if (params.status) q.set("status", params.status);
	if (params.startDate) q.set("startDate", params.startDate);
	if (params.endDate) q.set("endDate", params.endDate);
	const res = await fetch(`${API_BASE_URL}/api/v1/analytics/tenant-orders?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

/** GET /api/v1/analytics/hourly */
export async function fetchTenantHourlyHistory(params: {
	date?: string;
	outletId?: string;
	timezone?: string;
}): Promise<{ date: string; hourly: HourlyPoint[] }> {
	const q = new URLSearchParams();
	if (params.date) q.set("date", params.date);
	if (params.outletId) q.set("outletId", params.outletId);
	q.set("timezone", params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
	const res = await fetch(`${API_BASE_URL}/api/v1/analytics/hourly?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

/** GET /api/v1/analytics/hourly-orders */
export async function fetchTenantHourlyOrders(params: {
	date: string;
	hour: number;
	outletId?: string;
	timezone?: string;
}): Promise<{ date: string; hour: number; orders: OrderHistoryItem[] }> {
	const q = new URLSearchParams();
	q.set("date", params.date);
	q.set("hour", String(params.hour));
	if (params.outletId) q.set("outletId", params.outletId);
	q.set("timezone", params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
	const res = await fetch(`${API_BASE_URL}/api/v1/analytics/hourly-orders?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

/** GET /api/v1/users/all (tenant-scoped by backend auth) */
export async function fetchTenantUsers(params: {
	cursor?: string;
	prevCursor?: string;
	perPage?: number;
	role?: string;
	search?: string;
}): Promise<{ users: TenantUserRecord[]; pagination: CursorPagination }> {
	const q = new URLSearchParams();
	if (params.cursor) q.set("cursor", params.cursor);
	if (params.prevCursor) q.set("prevCursor", params.prevCursor);
	q.set("perPage", String(params.perPage ?? 10));
	if (params.role) q.set("role", params.role);
	if (params.search) q.set("search", params.search);

	const res = await fetch(`${API_BASE_URL}/api/v1/users/all?${q}`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = await parseOrThrow(res);
	return parsed.data;
}

/** PATCH /api/v1/users/:userId/toggle-status (tenant-scoped by backend auth) */
export async function toggleTenantUserStatus(
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

// ── Kiosk language settings ───────────────────────────────────────────────────

/** GET /api/v1/tenants/:tenantId/languages */
export async function fetchTenantLanguages(tenantId: string): Promise<string[]> {
	const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/languages`, {
		method: "GET",
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<{ kioskLanguages: string[] }>;
	return parsed.data.kioskLanguages;
}

/** PATCH /api/v1/tenants/:tenantId/languages */
export async function updateTenantLanguages(
	tenantId: string,
	kioskLanguages: string[]
): Promise<string[]> {
	const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenantId}/languages`, {
		method: "PATCH",
		credentials: "include",
		headers: getAuthHeaders(),
		body: JSON.stringify({ kioskLanguages }),
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<{ kioskLanguages: string[] }>;
	return parsed.data.kioskLanguages;
}
