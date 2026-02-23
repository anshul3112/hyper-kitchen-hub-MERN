const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

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
