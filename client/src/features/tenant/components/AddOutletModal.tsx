import { useState } from "react";
import { createOutlet, type CreateOutletInput, type Outlet } from "../api";
import { MAX_TEXT_LENGTH, isAtTextLimit, trimToMaxLength } from "../../../common/utils/textLimits";
import { isValidEmail, isValidPhone, normalizePhoneInput } from "../../../common/utils/fieldValidation";

type Props = {
  onClose: () => void;
  onSuccess: (outlet: Outlet) => void;
};

export default function AddOutletModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<CreateOutletInput>({
    name: "",
    address: "",
    contacts: {
      email: "",
      phoneNumber: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (field: "name" | "address" | "email" | "phoneNumber", value: string) => {
    if (field === "name") return value.trim() ? "" : "Outlet name is required.";
    if (field === "address") return value.trim() ? "" : "Address is required.";
    if (field === "email") return value.trim() && !isValidEmail(value) ? "Enter a valid email address." : "";
    if (field === "phoneNumber") return value.trim() && !isValidPhone(value) ? "Phone number must be exactly 10 digits." : "";
    return "";
  };

  const update = (key: keyof CreateOutletInput, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name?.trim()) nextErrors.name = "Outlet name is required.";
    if (!form.address?.trim()) nextErrors.address = "Address is required.";
    if (form.contacts?.email?.trim() && !isValidEmail(form.contacts.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (form.contacts?.phoneNumber?.trim() && !isValidPhone(form.contacts.phoneNumber)) {
      nextErrors.phoneNumber = "Phone number must be exactly 10 digits.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const canSubmit =
    Boolean(form.name?.trim()) &&
    Boolean(form.address?.trim()) &&
    !fieldErrors.name &&
    !fieldErrors.address &&
    !fieldErrors.email &&
    !fieldErrors.phoneNumber;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");

    try {
      const created = await createOutlet({
        name: form.name.trim(),
        address: form.address.trim(),
        contacts: {
          email: form.contacts?.email?.trim() || undefined,
          phoneNumber: form.contacts?.phoneNumber || undefined,
        },
      });
      onSuccess(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create outlet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Add New Outlet</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={submit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name</label>
            <input
              value={form.name}
              onChange={(e) => {
                const value = trimToMaxLength(e.target.value);
                update("name", value);
                setFieldErrors((prev) => ({ ...prev, name: validateField("name", value) }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
              disabled={loading}
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.name || "") ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              value={form.address}
              onChange={(e) => {
                const value = trimToMaxLength(e.target.value);
                update("address", value);
                setFieldErrors((prev) => ({ ...prev, address: validateField("address", value) }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
              disabled={loading}
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.address || "") ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.address ? <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p> : null}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email (optional)</label>
            <input
              type="email"
              value={form.contacts?.email || ""}
              onChange={(e) => {
                const value = trimToMaxLength(e.target.value);
                update("contacts", { ...form.contacts, email: value });
                setFieldErrors((prev) => ({ ...prev, email: validateField("email", value) }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              disabled={loading}
              maxLength={MAX_TEXT_LENGTH}
            />
            {isAtTextLimit(form.contacts?.email || "") ? (
              <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
            ) : null}
            {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (optional)</label>
            <input
              value={form.contacts?.phoneNumber || ""}
              onChange={(e) => {
                const value = normalizePhoneInput(e.target.value);
                update("contacts", { ...form.contacts, phoneNumber: value });
                setFieldErrors((prev) => ({ ...prev, phoneNumber: validateField("phoneNumber", value) }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              disabled={loading}
              maxLength={10}
            />
            {fieldErrors.phoneNumber ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phoneNumber}</p> : null}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading || !canSubmit}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
