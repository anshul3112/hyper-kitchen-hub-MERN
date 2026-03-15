import { useState } from "react";
import {
  createOutletStaff,
  type OutletStaffMember,
  type OutletStaffRole,
} from "../api";
import { MAX_TEXT_LENGTH, isAtTextLimit, trimToMaxLength } from "../../../common/utils/textLimits";
import { isValidEmail, isValidPassword, isValidPhone, normalizePhoneInput } from "../../../common/utils/fieldValidation";

type Props = {
  onClose: () => void;
  onSuccess: (member: OutletStaffMember) => void;
};

const ROLE_OPTIONS: { value: OutletStaffRole; label: string; description: string }[] = [
  {
    value: "kitchenStaff",
    label: "Kitchen Staff",
    description: "Access to kitchen display, advance order status",
  },
  {
    value: "billingStaff",
    label: "Billing Staff",
    description: "Access to billing & payment workflows",
  },
];

const EMPTY = { name: "", email: "", phoneNumber: "", password: "" };

export default function CreateOutletUserModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof EMPTY, string>>>({});
  const [selectedRole, setSelectedRole] = useState<OutletStaffRole>("kitchenStaff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateField = (field: keyof typeof EMPTY, value: string) => {
    if (field === "name") {
      return value.trim() ? "" : "Full name is required.";
    }
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

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => {
      const nextValue = field === "phoneNumber"
        ? normalizePhoneInput(e.target.value)
        : trimToMaxLength(e.target.value);
      setFieldErrors((current) => ({ ...current, [field]: validateField(field, nextValue) }));
      return { ...prev, [field]: nextValue };
    });

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof typeof EMPTY, string>> = {};
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
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.phoneNumber.trim()) &&
    Boolean(form.password) &&
    !fieldErrors.name &&
    !fieldErrors.email &&
    !fieldErrors.phoneNumber &&
    !fieldErrors.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;
    setLoading(true);
    try {
      const member = await createOutletStaff({ ...form, name: form.name.trim(), email: form.email.trim(), role: selectedRole });
      onSuccess(member);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Add Staff Member</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Role selector */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Role</p>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedRole(opt.value)}
                  className={`border rounded-xl px-4 py-3 text-left transition ${
                    selectedRole === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      selectedRole === opt.value ? "text-blue-700" : "text-gray-800"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              required
              placeholder="e.g. Ravi Kumar"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.name) ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              required
              placeholder="staff@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.email) ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={set("phoneNumber")}
              required
              placeholder="9876543210"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              maxLength={10}
            />
            {fieldErrors.phoneNumber ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p> : null}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              placeholder="Min 8 characters"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.password) ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
