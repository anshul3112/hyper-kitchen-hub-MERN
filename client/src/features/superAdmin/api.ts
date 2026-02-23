
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
				mobile: payload.phone,
			},
			address: payload.address,
		}),
	});

	const parsed = (await parseOrThrow(res)) as ApiResponse<Tenant>;
	return parsed.data;
}
