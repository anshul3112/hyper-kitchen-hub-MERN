import { useEffect, useState } from "react";

import DashboardHeader from "../../../common/components/DashboardHeader";
import NavTabs from "../../../common/components/NavTabs";
import StatCard from "../../../common/components/StatCard";

import { fetchOutlets, type Outlet } from "../api";
import AddOutletModal from "../components/AddOutletModal";
import AddOutletAdminModal from "../components/AddOutletAdminModal";
import OutletsTable from "../components/OutletsTable";
import TenantMenuPanel from "../components/TenantMenuPanel";
import TenantOrderHistoryTab from "../components/TenantOrderHistoryTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "outlets", label: "Outlets" },
  { key: "menu", label: "Menu" },
  { key: "orders", label: "Orders" },
];

export default function TenantAdminPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    loadOutlets();
  }, []);

  const loadOutlets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchOutlets();
      setOutlets(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch outlets");
    } finally {
      setLoading(false);
    }
  };

  const handleOutletAdded = (newOutlet: Outlet) => {
    setOutlets((prev) => [newOutlet, ...prev]);
    setIsModalOpen(false);
  };

  const handleOutletToggled = (updated: Outlet) => {
    setOutlets((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Tenant Admin Dashboard"
        subtitle="Manage your outlets"
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <NavTabs tabs={TABS} active={activeSection} onChange={setActiveSection} />

        {activeSection === "overview" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard label="Total Outlets" value={loading ? "..." : outlets.length} />
              <StatCard
                label="Active Outlets"
                value={loading ? "..." : outlets.filter((o) => o.status).length}
                color="green"
              />
              <StatCard
                label="Inactive Outlets"
                value={loading ? "..." : outlets.filter((o) => !o.status).length}
                color="red"
              />
            </div>
          </div>
        )}

        {activeSection === "outlets" && (
          <OutletsTable
            outlets={outlets}
            loading={loading}
            error={error}
            onAddClick={() => setIsModalOpen(true)}
            onAddAdminClick={() => setIsAdminModalOpen(true)}
            onToggle={handleOutletToggled}
          />
        )}

        {activeSection === "menu" && <TenantMenuPanel />}

        {activeSection === "orders" && <TenantOrderHistoryTab />}
      </main>

      {isModalOpen && (
        <AddOutletModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleOutletAdded}
        />
      )}

      {isAdminModalOpen && (
        <AddOutletAdminModal
          outlets={outlets}
          onClose={() => setIsAdminModalOpen(false)}
          onSuccess={() => setIsAdminModalOpen(false)}
        />
      )}
    </div>
  );
}
