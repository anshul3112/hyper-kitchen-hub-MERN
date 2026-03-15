import { useEffect, useState, useCallback } from "react";
import {
  fetchTenantUsers,
  toggleTenantUserStatus,
  type TenantUserRecord,
  type CursorPagination,
} from "../api";
import UserDetailsModal from "../../../common/components/UserDetailsModal";
import TruncatedText from "../../../common/components/TruncatedText";

const ROLE_OPTIONS = ["", "tenantAdmin", "tenantOwner", "outletAdmin", "outletOwner", "kitchenStaff", "billingStaff"];

const ROLE_LABEL_MAP: Record<string, string> = {
  tenantAdmin: "Tenant Admin",
  tenantOwner: "Tenant Owner",
  outletAdmin: "Outlet Admin",
  outletOwner: "Outlet Owner",
  kitchenStaff: "Kitchen Staff",
  billingStaff: "Billing Staff",
};

const ROLE_COLORS: Record<string, string> = {
  tenantAdmin: "bg-blue-100 text-blue-700",
  tenantOwner: "bg-indigo-100 text-indigo-700",
  outletAdmin: "bg-cyan-100 text-cyan-700",
  outletOwner: "bg-teal-100 text-teal-700",
  kitchenStaff: "bg-orange-100 text-orange-700",
  billingStaff: "bg-yellow-100 text-yellow-700",
};

export default function TenantUserManagementTab() {
  const [users, setUsers] = useState<TenantUserRecord[]>([]);
  const [pagination, setPagination] = useState<CursorPagination>({
    nextCursor: null,
    prevCursor: null,
    perPage: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<TenantUserRecord | null>(null);

  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (cursor?: string, prevCursor?: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchTenantUsers({
        cursor,
        prevCursor,
        perPage: 10,
        role,
        search: debouncedSearch,
      });
      setUsers(result.users);
      setPagination(result.pagination);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [role, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
    void load();
  }, [load]);

  const handleToggle = async (user: TenantUserRecord) => {
    setToggling(user._id);
    try {
      const updated = await toggleTenantUserStatus(user._id);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, status: updated.status } : u)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
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
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option ? (ROLE_LABEL_MAP[option] ?? option) : "All Roles"}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setRole("");
            setSearch("");
          }}
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
          <h3 className="text-sm font-semibold text-gray-700">Tenant Users</h3>
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
                  {["Name", "Email", "Role", "Outlet", "Status", "Joined", "Action"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">
                      <TruncatedText text={user.name} maxLength={24} />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      <TruncatedText text={user.email} maxLength={28} />
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABEL_MAP[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      <TruncatedText text={user.outlet?.outletName || "—"} maxLength={20} />
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {user.status ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          View details
                        </button>
                        <button
                          onClick={() => void handleToggle(user)}
                          disabled={toggling === user._id}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 ${
                            user.status ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-green-600 bg-green-50 hover:bg-green-100"
                          }`}
                        >
                          {toggling === user._id ? "..." : user.status ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(pagination.hasPrevPage || pagination.hasNextPage) && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-800">{currentPage}</span>
              {pagination.totalPages > 0 && (
                <> of <span className="font-semibold text-gray-800">{pagination.totalPages}</span></>
              )}
              {pagination.total > 0 && <span className="text-gray-400 ml-1">({pagination.total} total)</span>}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCurrentPage((page) => page - 1);
                  void load(undefined, pagination.prevCursor ?? undefined);
                }}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  setCurrentPage((page) => page + 1);
                  void load(pagination.nextCursor ?? undefined);
                }}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser ? (
        <UserDetailsModal
          user={selectedUser}
          roleLabel={ROLE_LABEL_MAP[selectedUser.role] ?? selectedUser.role}
          onClose={() => setSelectedUser(null)}
        />
      ) : null}
    </div>
  );
}
