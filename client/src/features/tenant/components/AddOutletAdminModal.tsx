import { useState, useRef, useEffect } from "react";
import { createOutletAdmin, type Outlet, type OutletAdmin } from "../api";

type Props = {
  outlets: Outlet[];
  onClose: () => void;
  onSuccess: (admin: OutletAdmin) => void;
};

export default function AddOutletAdminModal({ outlets, onClose, onSuccess }: Props) {
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [outletSearch, setOutletSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOutlets = outlets.filter((o) =>
    o.name.toLowerCase().includes(outletSearch.toLowerCase()),
  );

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectOutlet = (o: Outlet) => {
    setSelectedOutletId(o._id);
    setOutletSearch(o.name);
    setDropdownOpen(false);
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const selectedOutlet = outlets.find((o) => o._id === selectedOutletId);
    if (!selectedOutlet) {
      setError("Please select an outlet.");
      return;
    }
    if (!selectedOutlet.tenant?.tenantId) {
      setError("Selected outlet has no tenant info. Please refresh and try again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const created = await createOutletAdmin({
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        outlet: { outletId: selectedOutlet._id, outletName: selectedOutlet.name },
        tenant: {
          tenantId: selectedOutlet.tenant.tenantId,
          tenantName: selectedOutlet.tenant.tenantName,
        },
      });
      onSuccess(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create outlet admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Add Outlet Admin</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Searchable outlet selector */}
          <div ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Outlet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={outletSearch}
                onChange={(e) => {
                  setOutletSearch(e.target.value);
                  setSelectedOutletId("");
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search outlet..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm pr-8"
                disabled={loading}
                autoComplete="off"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>

              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredOutlets.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">No outlets found</div>
                  ) : (
                    filteredOutlets.map((o) => (
                      <button
                        key={o._id}
                        type="button"
                        onClick={() => selectOutlet(o)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                          selectedOutletId === o._id
                            ? "bg-blue-50 font-medium text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {o.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* Hidden required anchor */}
            <input
              type="text"
              value={selectedOutletId}
              onChange={() => {}}
              required
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
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
            />
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
            />
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
            />
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
            />
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
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
