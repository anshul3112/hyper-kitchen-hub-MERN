import { useEffect, useState, useCallback } from "react";
import { fetchAllUsers, toggleUserStatus, fetchTenants, type UserRecord, type Pagination, type Tenant } from "../api";

const ROLE_OPTIONS = [
  "", "superAdmin", "tenantAdmin", "tenantOwner",
  "outletAdmin", "outletOwner", "kitchenStaff", "billingStaff",
];

const ROLE_LABEL_MAP: Record<string, string> = {
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
  tenantOwner: "bg-indigo-100 text-indigo-700",
  outletAdmin: "bg-cyan-100 text-cyan-700",
  outletOwner: "bg-teal-100 text-teal-700",
  kitchenStaff: "bg-orange-100 text-orange-700",
  billingStaff: "bg-yellow-100 text-yellow-700",
};

export default function UserManagementTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const [role, setRole] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchTenants().then((r) => setTenants(r.data || [])).catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAllUsers({ page: p, limit: 20, role, tenantId, search: debouncedSearch });
      setUsers(result.users);
      setPagination(result.pagination);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [role, tenantId, debouncedSearch]);

  useEffect(() => { load(1); }, [load]);

  const handleToggle = async (user: UserRecord) => {
    setToggling(user._id);
    try {
      const updated = await toggleUserStatus(user._id);
      setUsers((prev) =>
        prev.map((u) => (u._id === updated._id ? { ...u, status: updated.status } : u))
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <input
            type="text"
            placeholder="Name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r ? (ROLE_LABEL_MAP[r] ?? r) : "All Roles"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tenant</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setRole(""); setTenantId(""); setSearch(""); }}
          className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            Users
            {pagination.total > 0 && (
              <span className="ml-2 text-gray-400 font-normal">({pagination.total} total)</span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Name", "Email", "Role", "Tenant / Outlet", "Status", "Joined", "Action"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{u.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABEL_MAP[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {u.tenant?.tenantName || u.outlet?.outletName || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.status ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={toggling === u._id || u.role === "superAdmin"}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 ${
                          u.status
                            ? "text-red-600 bg-red-50 hover:bg-red-100"
                            : "text-green-600 bg-green-50 hover:bg-green-100"
                        }`}
                      >
                        {toggling === u._id ? "..." : u.status ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
