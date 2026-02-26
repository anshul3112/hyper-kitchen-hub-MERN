import { useState, useEffect } from "react";

import DashboardHeader from "../../../common/components/DashboardHeader";

import { fetchTenants, type Tenant } from "../api";
import AddTenantModal from "../components/AddTenantModal";
import AddTenantAdminModal from "../components/AddTenantAdminModal";
import TenantsTable from "../components/TenantsTable";
import AnalyticsTab from "../components/AnalyticsTab";
import OrderHistoryTab from "../components/OrderHistoryTab";
import UserManagementTab from "../components/UserManagementTab";

type Tab = "analytics" | "tenants" | "orders" | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "analytics", label: "Analytics Overview" },
  { id: "tenants", label: "Manage Tenants" },
  { id: "orders", label: "Order History" },
  { id: "users", label: "User Management" },
];

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "tenants") loadTenants();
  }, [activeTab]);

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

  const handleTenantUpdated = (updated: Tenant) => {
    setTenants((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Super Admin Dashboard"
        subtitle="Manage your entire organization"
      />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "analytics" && <AnalyticsTab />}

        {activeTab === "tenants" && (
          <TenantsTable
            tenants={tenants}
            loading={loading}
            error={error}
            onAddTenantClick={() => setIsTenantModalOpen(true)}
            onAddAdminClick={() => setIsAdminModalOpen(true)}
            onTenantUpdated={handleTenantUpdated}
          />
        )}

        {activeTab === "orders" && <OrderHistoryTab />}

        {activeTab === "users" && <UserManagementTab />}
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
