const BASE_URL = "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken") ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      res.statusText ||
      "Request failed";
    throw new Error(msg);
  }
  return data;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export type UserProfile = {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: boolean;
  outlet?: { outletId: string; outletName: string };
  tenant?: { tenantId: string; tenantName: string };
  createdAt?: string;
};

/** GET /api/v1/users/profile */
export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/profile`, { headers: authHeaders() });
  const data = await parseOrThrow(res);
  return data.data as UserProfile;
}

/** PATCH /api/v1/users/profile/update */
export async function updateProfile(fields: {
  name?: string;
  email?: string;
  phoneNumber?: string;
}): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/profile/update`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(fields),
  });
  const data = await parseOrThrow(res);
  return data.data as UserProfile;
}

/** PATCH /api/v1/users/profile/change-password */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/profile/change-password`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await parseOrThrow(res);
}

// ── Tenant contacts ────────────────────────────────────────────────────────────────

export type TenantInfo = {
  _id: string;
  name: string;
  address?: string;
  contacts?: { email?: string; phoneNumber?: string };
  status: boolean;
  imageKey?: string;
};

/** PATCH /api/v1/tenants/:tenantId/update */
export async function updateTenantDetails(
  tenantId: string,
  fields: { name?: string; address?: string; contacts?: { email?: string; phoneNumber?: string } }
): Promise<TenantInfo> {
  const res = await fetch(`${BASE_URL}/tenants/${tenantId}/update`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(fields),
  });
  const data = await parseOrThrow(res);
  return data.data as TenantInfo;
}

// ── Outlet contacts ─────────────────────────────────────────────────────────────────

export type OutletInfo = {
  _id: string;
  name: string;
  address?: string;
  contacts?: { email?: string; phoneNumber?: string };
  status: boolean;
};

/** PATCH /api/v1/outlets/:outletId/update */
export async function updateOutletDetails(
  outletId: string,
  fields: { name?: string; address?: string; contacts?: { email?: string; phoneNumber?: string } }
): Promise<OutletInfo> {
  const res = await fetch(`${BASE_URL}/outlets/${outletId}/update`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(fields),
  });
  const data = await parseOrThrow(res);
  return data.data as OutletInfo;
}
