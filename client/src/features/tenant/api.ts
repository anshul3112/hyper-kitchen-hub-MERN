
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
	tenant: { tenantId: string; tenantName: string };
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

export type MenuFilter = {
	_id: string;
	name: string;
	imageUrl?: string | null;
	isActive: boolean;
	tenantId: string;
	createdAt?: string;
	updatedAt?: string;
};

export type MenuCategory = {
	_id: string;
	name: string;
	imageUrl?: string | null;
	status: boolean;
	tenantId: string;
	createdAt?: string;
	updatedAt?: string;
};

export type MenuItemCategory = { _id: string; name: string; status: boolean };
export type MenuItemFilter = { _id: string; name: string; isActive: boolean };

export type MenuItem = {
	_id: string;
	name: string;
	description: string;
	defaultAmount: number;
	imageUrl?: string | null;
	status: boolean;
	tenantId: string;
	category: MenuItemCategory | null;
	filters: MenuItemFilter[];
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

export async function createFilter(payload: { name: string; imageUrl?: string }): Promise<MenuFilter> {
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
	payload: { name?: string; imageUrl?: string; isActive?: boolean },
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

export async function createCategory(payload: { name: string; imageUrl?: string }): Promise<MenuCategory> {
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
	payload: { name?: string; imageUrl?: string; status?: boolean },
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
	name: string;
	description?: string;
	defaultAmount: number;
	imageUrl?: string;
	category: string;
	filters?: string[];
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
 * Upload an image file for an item.
 * Sends multipart/form-data with field name "image".
 * Returns the Cloudinary URL.
 */
export async function uploadItemImage(file: File): Promise<string> {
	const token = localStorage.getItem("accessToken");
	const form = new FormData();
	form.append("image", file);

	const res = await fetch(`${API_BASE_URL}/api/v1/items/upload-image`, {
		method: "POST",
		credentials: "include",
		headers: { Authorization: token ? `Bearer ${token}` : "" },
		body: form,
	});
	const parsed = (await parseOrThrow(res)) as ApiResponse<{ imageUrl: string }>;
	return parsed.data.imageUrl;
}
