import { useState } from "react";
import { toggleTenantStatus, type Tenant } from "../api";
import TenantDetailsModal from "./TenantDetailsModal";

type Props = {
  tenants: Tenant[];
  loading: boolean;
  error: string;
  onAddTenantClick: () => void;
  onAddAdminClick: () => void;
  onTenantUpdated: (tenant: Tenant) => void;
};

export default function TenantsTable({
  tenants,
  loading,
  error,
  onAddTenantClick,
  onAddAdminClick,
  onTenantUpdated,
}: Props) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);

  const handleToggle = async (tenant: Tenant) => {
    const action = tenant.status ? "disable" : "enable";
    if (!window.confirm(`Are you sure you want to ${action} "${tenant.name}"?`)) return;
    setToggling(tenant._id);
    try {
      const updated = await toggleTenantStatus(tenant._id);
      onTenantUpdated(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update tenant");
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Manage Tenants</h2>
        <div className="flex gap-2">
          <button
            onClick={onAddAdminClick}
            className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Add Tenant Admin
          </button>
          <button
            onClick={onAddTenantClick}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add New Tenant
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <p className="text-center text-gray-500">Loading tenants...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <p className="text-center text-gray-500">No tenants found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Name", "Address", "Status", "Created At", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((tenant) => (
                  <tr key={tenant._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tenant.address || "—"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tenant.status
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tenant.status ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailsTenant(tenant)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleToggle(tenant)}
                          disabled={toggling === tenant._id}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                            tenant.status
                              ? "text-red-600 bg-red-50 hover:bg-red-100"
                              : "text-green-600 bg-green-50 hover:bg-green-100"
                          }`}
                        >
                          {toggling === tenant._id ? "..." : tenant.status ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailsTenant && (
        <TenantDetailsModal
          tenantId={detailsTenant._id}
          tenantName={detailsTenant.name}
          onClose={() => setDetailsTenant(null)}
        />
      )}
    </>
  );
}
