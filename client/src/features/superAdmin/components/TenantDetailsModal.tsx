import { useEffect, useState } from "react";
import { fetchTenantDetails, type TenantDetails } from "../api";

type Props = {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
};

export default function TenantDetailsModal({ tenantId, tenantName, onClose }: Props) {
  const [data, setData] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetchTenantDetails(tenantId);
        if (!cancelled) setData(result);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tenantId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{tenantName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl font-light"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading && <p className="text-center text-gray-400">Loading...</p>}
          {error && (
            <p className="text-center text-red-500 text-sm">{error}</p>
          )}

          {data && (
            <>
              {/* Contacts */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Contact Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div>
                    <span className="text-gray-400">Email: </span>
                    {data.tenant.contacts?.email || "—"}
                  </div>
                  <div>
                    <span className="text-gray-400">Phone: </span>
                    {data.tenant.contacts?.phoneNumber || "—"}
                  </div>
                  <div>
                    <span className="text-gray-400">Address: </span>
                    {data.tenant.address || "—"}
                  </div>
                  <div>
                    <span className="text-gray-400">Status: </span>
                    <span className={`font-medium ${data.tenant.status ? "text-green-600" : "text-red-600"}`}>
                      {data.tenant.status ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order stats */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Order Stats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Orders", value: data.orderStats.totalOrders },
                    { label: "Revenue", value: `₹${data.orderStats.totalRevenue.toLocaleString()}` },
                    { label: "Completed", value: data.orderStats.completedOrders },
                    { label: "Pending", value: data.orderStats.pendingOrders },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">{s.label}</p>
                      <p className="text-lg font-bold text-gray-800">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Users */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Users ({data.users.length})
                </h3>
                {data.users.length === 0 ? (
                  <p className="text-sm text-gray-400">No users assigned to this tenant.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Name", "Email", "Role", "Status"].map((h) => (
                          <th key={h} className="pb-2 text-left text-xs font-medium text-gray-400 uppercase pr-4">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.users.map((u) => (
                        <tr key={u._id} className="hover:bg-gray-50">
                          <td className="py-2 pr-4 text-gray-800 font-medium">{u.name}</td>
                          <td className="py-2 pr-4 text-gray-500">{u.email}</td>
                          <td className="py-2 pr-4 text-gray-500 capitalize">{u.role}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {u.status ? "Active" : "Disabled"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
