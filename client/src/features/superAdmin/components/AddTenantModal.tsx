import { useState } from "react";
import { createTenant } from "../api";
import type { Tenant } from "../api";
import { MAX_TEXT_LENGTH, isAtTextLimit, trimToMaxLength } from "../../../common/utils/textLimits";
import { isValidEmail, isValidPhone, normalizePhoneInput } from "../../../common/utils/fieldValidation";

type Props = {
  onClose: () => void;
  onSuccess: (tenant: Tenant) => void;
};

export default function AddTenantModal({ onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const validateField = (field: keyof typeof formData, value: string) => {
    if (field === "name") return value.trim() ? "" : "Tenant name is required.";
    if (field === "address") return value.trim() ? "" : "Address is required.";
    if (field === "email") return value.trim() && !isValidEmail(value) ? "Enter a valid email address." : "";
    if (field === "phone") return value.trim() && !isValidPhone(value) ? "Phone number must be exactly 10 digits." : "";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.name as keyof typeof formData;
    const value = key === "phone" ? normalizePhoneInput(e.target.value) : trimToMaxLength(e.target.value);
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof typeof formData, string>> = {};
    if (!formData.name.trim()) nextErrors.name = "Tenant name is required.";
    if (!formData.address.trim()) nextErrors.address = "Address is required.";
    if (formData.email.trim() && !isValidEmail(formData.email)) nextErrors.email = "Enter a valid email address.";
    if (formData.phone.trim() && !isValidPhone(formData.phone)) nextErrors.phone = "Phone number must be exactly 10 digits.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canSubmit =
    Boolean(formData.name.trim()) &&
    Boolean(formData.address.trim()) &&
    !fieldErrors.name &&
    !fieldErrors.address &&
    !fieldErrors.email &&
    !fieldErrors.phone;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    try {
      const created = await createTenant({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        address: formData.address.trim(),
      });
      onSuccess(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Add New Tenant</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Tenant Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
                disabled={loading}
                autoFocus
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(formData.name) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
              {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                disabled={loading}
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(formData.email) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
              {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                disabled={loading}
                maxLength={10}
              />
              {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
                disabled={loading}
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(formData.address) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
              {fieldErrors.address ? <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p> : null}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              disabled={loading || !canSubmit}
            >
              {loading ? "Adding..." : "Add Tenant"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
