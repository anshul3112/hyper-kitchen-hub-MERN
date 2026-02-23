import { useState, useEffect } from "react";

import DashboardHeader from "../../../common/components/DashboardHeader";

import { fetchTenants, type Tenant } from "../api";
import AddTenantModal from "../components/AddTenantModal";
import AddTenantAdminModal from "../components/AddTenantAdminModal";
import TenantsTable from "../components/TenantsTable";

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchTenants();
      setTenants(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleTenantAdded = (tenant: Tenant) => {
    setTenants((prev) => [tenant, ...prev]);
    setIsTenantModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Super Admin Dashboard"
        subtitle="Manage your entire organization"
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <TenantsTable
          tenants={tenants}
          loading={loading}
          error={error}
          onAddTenantClick={() => setIsTenantModalOpen(true)}
          onAddAdminClick={() => setIsAdminModalOpen(true)}
        />
      </main>

      {isTenantModalOpen && (
        <AddTenantModal
          onClose={() => setIsTenantModalOpen(false)}
          onSuccess={handleTenantAdded}
        />
      )}

      {isAdminModalOpen && (
        <AddTenantAdminModal
          tenants={tenants}
          onClose={() => setIsAdminModalOpen(false)}
          onSuccess={() => setIsAdminModalOpen(false)}
        />
      )}
    </div>
  );
}
