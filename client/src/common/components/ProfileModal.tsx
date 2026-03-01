import { useEffect, useState } from "react";
import {
  fetchProfile,
  changePassword,
  type UserProfile,
} from "../../features/auth/api";

type Props = {
  onClose: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  superAdmin: "Super Admin",
  tenantAdmin: "Tenant Admin",
  tenantOwner: "Tenant Owner",
  outletAdmin: "Outlet Admin",
  outletOwner: "Outlet Owner",
  kitchenStaff: "Kitchen Staff",
  billingStaff: "Billing Staff",
};

export default function ProfileModal({ onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  // Change-password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProfile();
        setProfile(data);
      } catch (err: unknown) {
        setProfileError(
          err instanceof Error ? err.message : "Failed to load profile"
        );
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">My Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Profile info */}
          {loadingProfile ? (
            <div className="text-sm text-gray-500 text-center py-4">
              Loading profile…
            </div>
          ) : profileError ? (
            <div className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
              {profileError}
            </div>
          ) : profile ? (
            <div className="space-y-3">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200 flex-shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {profile.name}
                  </p>
                  <span className="inline-block text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5 mt-0.5">
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
                <InfoRow label="Email" value={profile.email} />
                <InfoRow label="Phone" value={profile.phoneNumber} />
                {profile.outlet?.outletName && (
                  <InfoRow label="Outlet" value={profile.outlet.outletName} />
                )}
                {profile.tenant?.tenantName && (
                  <InfoRow label="Tenant" value={profile.tenant.tenantName} />
                )}
                <InfoRow
                  label="Status"
                  value={
                    <span
                      className={`font-medium ${
                        profile.status ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {profile.status ? "Active" : "Inactive"}
                    </span>
                  }
                />
              </div>
            </div>
          ) : null}

          {/* Divider */}
          <hr className="border-gray-100" />

          {/* Change password */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Change Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <PasswordField
                id="cp-current"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                disabled={pwLoading}
              />
              <PasswordField
                id="cp-new"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                disabled={pwLoading}
                placeholder="Min. 6 characters"
              />
              <PasswordField
                id="cp-confirm"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                disabled={pwLoading}
              />

              {pwError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  ⚠️ {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                  ✓ {pwSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pwLoading ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium break-all">{value}</span>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          disabled={disabled}
          required
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10 disabled:opacity-60 placeholder-gray-400"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 text-xs select-none"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
