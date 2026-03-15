import { useState, useRef, useEffect } from "react";
import { createTenantAdmin, type Tenant, type TenantAdmin } from "../api";
import TruncatedText from "../../../common/components/TruncatedText";
import { MAX_TEXT_LENGTH, isAtTextLimit, trimToMaxLength } from "../../../common/utils/textLimits";
import { isValidEmail, isValidPassword, isValidPhone, normalizePhoneInput } from "../../../common/utils/fieldValidation";

type Props = {
  tenants: Tenant[];
  onClose: () => void;
  onSuccess: (admin: TenantAdmin) => void;
};

export default function AddTenantAdminModal({ tenants, onClose, onSuccess }: Props) {
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase()),
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectTenant = (t: Tenant) => {
    setSelectedTenantId(t._id);
    setTenantSearch(t.name);
    setDropdownOpen(false);
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof typeof form | "tenant", string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTenant = tenants.find((t) => t._id === selectedTenantId);

  const validateField = (field: keyof typeof form, value: string) => {
    if (field === "name") return value.trim() ? "" : "Full name is required.";
    if (field === "email") {
      if (!value.trim()) return "Email is required.";
      return isValidEmail(value) ? "" : "Enter a valid email address.";
    }
    if (field === "phoneNumber") {
      if (!value.trim()) return "Phone number is required.";
      return isValidPhone(value) ? "" : "Phone number must be exactly 10 digits.";
    }
    if (field === "password") {
      if (!value) return "Password is required.";
      return isValidPassword(value) ? "" : "Password must be at least 8 characters and include letters and numbers.";
    }
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.name as keyof typeof form;
    const value = key === "phoneNumber" ? normalizePhoneInput(e.target.value) : trimToMaxLength(e.target.value);
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof typeof form | "tenant", string>> = {};
    if (!selectedTenant) nextErrors.tenant = "Please select a tenant.";
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email address.";
    if (!form.phoneNumber.trim()) nextErrors.phoneNumber = "Phone number is required.";
    else if (!isValidPhone(form.phoneNumber)) nextErrors.phoneNumber = "Phone number must be exactly 10 digits.";
    if (!form.password) nextErrors.password = "Password is required.";
    else if (!isValidPassword(form.password)) nextErrors.password = "Password must be at least 8 characters and include letters and numbers.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canSubmit =
    Boolean(selectedTenantId) &&
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phoneNumber.trim()) &&
    Boolean(form.password) &&
    !fieldErrors.tenant &&
    !fieldErrors.name &&
    !fieldErrors.email &&
    !fieldErrors.phoneNumber &&
    !fieldErrors.password;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    const selectedTenantRecord = tenants.find((t) => t._id === selectedTenantId);
    if (!selectedTenantRecord) return;
    setLoading(true);
    setError("");
    try {
      const created = await createTenantAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.phoneNumber,
        tenant: { tenantId: selectedTenantRecord._id, tenantName: selectedTenantRecord.name },
      });
      onSuccess(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tenant admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Add Tenant Admin</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Searchable tenant selector */}
          <div ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Tenant <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => {
                  setTenantSearch(trimToMaxLength(e.target.value));
                  setSelectedTenantId("");
                  setFieldErrors((prev) => ({ ...prev, tenant: "" }));
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search tenant..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm pr-8"
                disabled={loading}
                autoComplete="off"
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(tenantSearch) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
              {/* chevron */}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>

              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredTenants.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No tenants found</div>
                  ) : (
                    filteredTenants.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => selectTenant(t)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                          selectedTenantId === t._id ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700"
                        }`}
                      >
                        <TruncatedText text={t.name} maxLength={30} showToggle={false} className="inline-block max-w-full truncate" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* Hidden required validation anchor */}
            <input
              type="text"
              value={selectedTenantId}
              onChange={() => {}}
              required
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
            {fieldErrors.tenant ? <p className="mt-1 text-xs text-red-600">{fieldErrors.tenant}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              required
              disabled={loading}
              autoFocus
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.name) ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              required
              disabled={loading}
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.email) ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              required
              disabled={loading}
              maxLength={10}
            />
            {fieldErrors.phoneNumber ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p> : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              required
              disabled={loading}
              placeholder="Min 8 characters"
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.password) ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-sm"
              disabled={loading || !canSubmit}
            >
              {loading ? "Creating..." : "Create Admin"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
