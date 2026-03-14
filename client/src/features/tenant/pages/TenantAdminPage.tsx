import { useEffect, useState } from "react";

import AccessBlockedScreen from "../../../common/components/AccessBlockedScreen";
import DashboardHeader from "../../../common/components/DashboardHeader";
import NavTabs from "../../../common/components/NavTabs";
import StatCard from "../../../common/components/StatCard";
import { fetchProfile } from "../../auth/api";
import { getBlockedAccessMessage, getErrorMessage, isBlockedAccessError } from "../../../common/utils/accessErrors";

import { fetchOutlets, type Outlet } from "../api";
import AddOutletModal from "../components/AddOutletModal";
import AddOutletAdminModal from "../components/AddOutletAdminModal";
import OutletsTable from "../components/OutletsTable";
import TenantMenuPanel from "../components/TenantMenuPanel";
import TenantOrderHistoryTab from "../components/TenantOrderHistoryTab";
import TenantKioskSettings from "../components/TenantKioskSettings";
import TenantUserManagementTab from "../components/TenantUserManagementTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "outlets", label: "Outlets" },
  { key: "menu", label: "Menu" },
  { key: "orders", label: "Orders" },
  { key: "users", label: "Users" },
  { key: "settings", label: "Settings" },
];

export default function TenantAdminPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [accessBlockedMessage, setAccessBlockedMessage] = useState("");

  useEffect(() => {
    void initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    setError("");
    try {
      await fetchProfile();
      const res = await fetchOutlets();
      setOutlets(res.data || []);
    } catch (err: unknown) {
      if (isBlockedAccessError(err)) {
        setAccessBlockedMessage(getBlockedAccessMessage(err, "Tenant access is disabled"));
        return;
      }
      setError(getErrorMessage(err, "Failed to fetch outlets"));
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

  const totalOutlets = outlets.length;
  const activeOutlets = outlets.filter((o) => o.status).length;
  const inactiveOutlets = totalOutlets - activeOutlets;
  const activeOutletPercent = totalOutlets > 0 ? Math.round((activeOutlets / totalOutlets) * 100) : 0;

  const withAddress = outlets.filter((o) => (o.address || "").trim().length > 0).length;
  const withContacts = outlets.filter((o) => (o.contacts?.email || "").trim() || (o.contacts?.phoneNumber || "").trim()).length;
  const withImage = outlets.filter((o) => Boolean(o.imageUrl)).length;

  const createdLast30Days = outlets.filter((o) => {
    if (!o.createdAt) return false;
    const ageMs = Date.now() - new Date(o.createdAt).getTime();
    return ageMs <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  const addressCoveragePercent = totalOutlets > 0 ? Math.round((withAddress / totalOutlets) * 100) : 0;
  const contactCoveragePercent = totalOutlets > 0 ? Math.round((withContacts / totalOutlets) * 100) : 0;
  const imageCoveragePercent = totalOutlets > 0 ? Math.round((withImage / totalOutlets) * 100) : 0;

  if (accessBlockedMessage) {
    return <AccessBlockedScreen title="Tenant dashboard unavailable" message={accessBlockedMessage} />;
  }

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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
              <StatCard
                label="New (Last 30 Days)"
                value={loading ? "..." : createdLast30Days}
              />
              <StatCard
                label="With Contact Details"
                value={loading ? "..." : withContacts}
                color="green"
              />
              <StatCard
                label="With Outlet Image"
                value={loading ? "..." : withImage}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Network Health</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Active Outlets</span>
                      <span className="font-semibold text-gray-800">{activeOutletPercent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${activeOutletPercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Address Coverage</span>
                      <span className="font-semibold text-gray-800">{addressCoveragePercent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${addressCoveragePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                      <p className="text-xs text-green-700">Active</p>
                      <p className="text-xl font-bold text-green-700">{activeOutlets}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                      <p className="text-xs text-red-700">Inactive</p>
                      <p className="text-xl font-bold text-red-700">{inactiveOutlets}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Profile Completeness</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Contact Details</span>
                      <span className="font-semibold text-gray-800">{contactCoveragePercent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${contactCoveragePercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Outlet Image</span>
                      <span className="font-semibold text-gray-800">{imageCoveragePercent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${imageCoveragePercent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-center">
                      <p className="text-xs text-purple-700">Contacts</p>
                      <p className="text-xl font-bold text-purple-700">{withContacts}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                      <p className="text-xs text-blue-700">Address</p>
                      <p className="text-xl font-bold text-blue-700">{withAddress}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                      <p className="text-xs text-amber-700">Image</p>
                      <p className="text-xl font-bold text-amber-700">{withImage}</p>
                    </div>
                  </div>
                </div>
              </div>
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

        {activeSection === "users" && <TenantUserManagementTab />}

        {activeSection === "settings" && <TenantKioskSettings />}
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
