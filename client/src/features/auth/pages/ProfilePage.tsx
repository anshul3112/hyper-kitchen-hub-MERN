import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchProfile,
  updateProfile,
  changePassword,
  updateTenantDetails,
  updateOutletDetails,
  type UserProfile,
  type TenantInfo,
  type OutletInfo,
} from "../api";

const BASE_URL = "http://localhost:8000/api/v1";
function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const ROLE_LABELS: Record<string, string> = {
  superAdmin: "Super Admin",
  tenantAdmin: "Tenant Admin",
  tenantOwner: "Tenant Owner",
  outletAdmin: "Outlet Admin",
  outletOwner: "Outlet Owner",
  kitchenStaff: "Kitchen Staff",
  billingStaff: "Billing Staff",
};

const ROLE_COLORS: Record<string, string> = {
  superAdmin: "bg-purple-100 text-purple-700",
  tenantAdmin: "bg-blue-100 text-blue-700",
  tenantOwner: "bg-blue-100 text-blue-700",
  outletAdmin: "bg-indigo-100 text-indigo-700",
  outletOwner: "bg-indigo-100 text-indigo-700",
  kitchenStaff: "bg-orange-100 text-orange-700",
  billingStaff: "bg-green-100 text-green-700",
};

const inputCls =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60 placeholder-gray-400";

// ── Reusable FormField ─────────────────────────────────────────────────────────
function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  disabled,
  placeholder,
  required,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <span className="text-blue-600">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── StatusMsg ──────────────────────────────────────────────────────────────────
function StatusMsg({ error, success }: { error: string; success: string }) {
  if (error)
    return (
      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠️ {error}</p>
    );
  if (success)
    return (
      <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ {success}</p>
    );
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const navigate = useNavigate();

  // ── Profile data ───────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  // ── Edit personal info ─────────────────────────────────────────────────────
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [infoSuccess, setInfoSuccess] = useState("");

  // ── Change password ────────────────────────────────────────────────────────
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // ── Tenant / Outlet entity info ────────────────────────────────────────────
  const [editEntityName, setEditEntityName] = useState("");
  const [editEntityAddress, setEditEntityAddress] = useState("");
  const [editEntityEmail, setEditEntityEmail] = useState("");
  const [editEntityPhone, setEditEntityPhone] = useState("");
  const [entitySaving, setEntitySaving] = useState(false);
  const [entityError, setEntityError] = useState("");
  const [entitySuccess, setEntitySuccess] = useState("");

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProfile();
        setProfile(data);
        setEditName(data.name);
        setEditEmail(data.email);
        setEditPhone(data.phoneNumber);
        // Load entity details
        await loadEntityInfo(data);
      } catch (err: unknown) {
        setProfileError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  const loadEntityInfo = async (p: UserProfile) => {
    try {
      if (
        ["tenantAdmin", "tenantOwner"].includes(p.role) &&
        p.tenant?.tenantId
      ) {
        const res = await fetch(
          `${BASE_URL}/tenants/${p.tenant.tenantId}/details`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        // getTenantDetails returns { data: { tenant, users, orderStats } }
        const t = (data.data?.tenant ?? data.data) as TenantInfo;
        if (t) {
          setEditEntityName(t.name ?? "");
          setEditEntityAddress(t.address ?? "");
          setEditEntityEmail(t.contacts?.email ?? "");
          setEditEntityPhone(t.contacts?.phoneNumber ?? "");
        }
      } else if (
        ["outletAdmin", "outletOwner"].includes(p.role) &&
        p.outlet?.outletId
      ) {
        const res = await fetch(
          `${BASE_URL}/outlets/${p.outlet.outletId}`,
          { headers: authHeaders() }
        );
        // Outlet doesn't have a get-by-id standalone endpoint yet;
        // use localStorage outletId and call the list endpoint as fallback
        if (res.ok) {
          const data = await res.json();
          // getOutletById returns { data: { outlet } }
          const o = (data.data?.outlet ?? data.data ?? data) as OutletInfo;
          if (o) {
            setEditEntityName(o.name ?? "");
            setEditEntityAddress(o.address ?? "");
            setEditEntityEmail(o.contacts?.email ?? "");
            setEditEntityPhone(o.contacts?.phoneNumber ?? "");
          }
        } else {
          // fallback: pre-fill name from profile
          setEditEntityName(p.outlet!.outletName);
        }
      }
    } catch {
      // silently ignore entity fetch errors
    }
  };

  // ── Save personal info ─────────────────────────────────────────────────────
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError("");
    setInfoSuccess("");
    setInfoSaving(true);
    try {
      const updated = await updateProfile({
        name: editName,
        email: editEmail,
        phoneNumber: editPhone,
      });
      setProfile((p) => (p ? { ...p, ...updated } : updated));
      localStorage.setItem("userName", updated.name);
      setInfoSuccess("Personal info updated successfully.");
    } catch (err: unknown) {
      setInfoError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setInfoSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(curPw, newPw);
      setPwSuccess("Password changed successfully.");
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  // ── Save entity info ───────────────────────────────────────────────────────
  const handleSaveEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntityError("");
    setEntitySuccess("");
    setEntitySaving(true);
    try {
      const fields = {
        name: editEntityName,
        address: editEntityAddress,
        contacts: { email: editEntityEmail, phoneNumber: editEntityPhone },
      };
      if (
        ["tenantAdmin", "tenantOwner"].includes(profile!.role) &&
        profile!.tenant?.tenantId
      ) {
        await updateTenantDetails(profile!.tenant.tenantId, fields);
        setEntitySuccess("Tenant details updated successfully.");
      } else if (
        ["outletAdmin", "outletOwner"].includes(profile!.role) &&
        profile!.outlet?.outletId
      ) {
        await updateOutletDetails(profile!.outlet.outletId, fields);
        setEntitySuccess("Outlet details updated successfully.");
      }
    } catch (err: unknown) {
      setEntityError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEntitySaving(false);
    }
  };

  const showEntitySection =
    profile &&
    (["tenantAdmin", "tenantOwner"].includes(profile.role) ||
      ["outletAdmin", "outletOwner"].includes(profile.role));

  const entityLabel =
    profile && ["tenantAdmin", "tenantOwner"].includes(profile.role)
      ? "Tenant"
      : "Outlet";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <h1 className="text-lg font-bold text-blue-600">My Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {profileLoading ? (
          <div className="text-center py-16 text-gray-400">Loading profile…</div>
        ) : profileError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-600 text-sm">
            {profileError}
          </div>
        ) : profile ? (
          <>
            {/* ── Identity card ─────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-6 py-5 flex items-center gap-5 shadow-lg shadow-blue-100">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xl truncate">{profile.name}</p>
                <p className="text-blue-100 text-sm truncate">{profile.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/20 text-white`}>
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                  {profile.tenant?.tenantName && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                      {profile.tenant.tenantName}
                    </span>
                  )}
                  {profile.outlet?.outletName && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                      {profile.outlet.outletName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Personal Info ──────────────────────────────────────────── */}
            <Section
              title="Personal Information"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="edit-name"
                    label="Full name"
                    value={editName}
                    onChange={setEditName}
                    disabled={infoSaving}
                    placeholder="Your name"
                    required
                  />
                  <Field
                    id="edit-phone"
                    label="Phone number"
                    type="tel"
                    value={editPhone}
                    onChange={setEditPhone}
                    disabled={infoSaving}
                    placeholder="+91XXXXXXXXXX"
                    required
                  />
                </div>
                <Field
                  id="edit-email"
                  label="Email address"
                  type="email"
                  value={editEmail}
                  onChange={setEditEmail}
                  disabled={infoSaving}
                  placeholder="you@example.com"
                  required
                />

                <div className="flex items-center justify-between pt-1">
                  <StatusMsg error={infoError} success={infoSuccess} />
                  <button
                    type="submit"
                    disabled={infoSaving}
                    className="ml-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                  >
                    {infoSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </Section>

            {/* ── Role badge (read-only metadata) ───────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="Role">
                <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[profile.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </InfoTile>
              <InfoTile label="Account Status">
                <span className={`text-sm font-medium ${profile.status ? "text-green-600" : "text-red-500"}`}>
                  {profile.status ? "Active" : "Inactive"}
                </span>
              </InfoTile>
              <InfoTile label="Member Since">
                <span className="text-sm text-gray-700">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </InfoTile>
            </div>

            {/* ── Tenant / Outlet Details (conditional) ─────────────────── */}
            {showEntitySection && (
              <Section
                title={`${entityLabel} Details`}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              >
                <form onSubmit={handleSaveEntity} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      id="entity-name"
                      label={`${entityLabel} name`}
                      value={editEntityName}
                      onChange={setEditEntityName}
                      disabled={entitySaving}
                      placeholder={`${entityLabel} name`}
                    />
                    <Field
                      id="entity-phone"
                      label="Contact phone"
                      type="tel"
                      value={editEntityPhone}
                      onChange={setEditEntityPhone}
                      disabled={entitySaving}
                      placeholder="+91XXXXXXXXXX"
                    />
                  </div>
                  <Field
                    id="entity-email"
                    label="Contact email"
                    type="email"
                    value={editEntityEmail}
                    onChange={setEditEntityEmail}
                    disabled={entitySaving}
                    placeholder="contact@example.com"
                  />
                  <Field
                    id="entity-address"
                    label="Address"
                    value={editEntityAddress}
                    onChange={setEditEntityAddress}
                    disabled={entitySaving}
                    placeholder="123 Street, City"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <StatusMsg error={entityError} success={entitySuccess} />
                    <button
                      type="submit"
                      disabled={entitySaving}
                      className="ml-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                    >
                      {entitySaving ? "Saving…" : `Update ${entityLabel}`}
                    </button>
                  </div>
                </form>
              </Section>
            )}

            {/* ── Change Password ────────────────────────────────────────── */}
            <Section
              title="Change Password"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            >
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Field
                  id="cur-pw"
                  label="Current password"
                  type="password"
                  value={curPw}
                  onChange={setCurPw}
                  disabled={pwSaving}
                  placeholder="••••••••"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="new-pw"
                    label="New password"
                    type="password"
                    value={newPw}
                    onChange={setNewPw}
                    disabled={pwSaving}
                    placeholder="Min. 6 characters"
                    required
                  />
                  <Field
                    id="confirm-pw"
                    label="Confirm new password"
                    type="password"
                    value={confirmPw}
                    onChange={setConfirmPw}
                    disabled={pwSaving}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <StatusMsg error={pwError} success={pwSuccess} />
                  <button
                    type="submit"
                    disabled={pwSaving || !curPw || !newPw || !confirmPw}
                    className="ml-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                  >
                    {pwSaving ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </form>
            </Section>
          </>
        ) : null}
      </main>
    </div>
  );
}

// ── InfoTile ────────────────────────────────────────────────────────────────
function InfoTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
