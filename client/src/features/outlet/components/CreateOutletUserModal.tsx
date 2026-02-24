import { useState } from "react";
import {
  createOutletStaff,
  type OutletStaffMember,
  type OutletStaffRole,
} from "../api";

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
  const [selectedRole, setSelectedRole] = useState<OutletStaffRole>("kitchenStaff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const member = await createOutletStaff({ ...form, role: selectedRole });
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
            />
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
            />
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
            />
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
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

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
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
