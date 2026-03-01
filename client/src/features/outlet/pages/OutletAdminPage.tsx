import { useEffect, useRef, useState } from "react";

import DashboardHeader from "../../../common/components/DashboardHeader";
import NavTabs from "../../../common/components/NavTabs";
import StatCard from "../../../common/components/StatCard";

import {
  fetchKiosks,
  fetchMenuDetails,
  type Kiosk,
  type MenuDetails,
} from "../api";
import CreateKioskModal from "../components/CreateKioskModal";
import KioskCard from "../components/KioskCard";
import MenuGrid from "../components/MenuGrid";
import InventoryTab from "../components/InventoryTab";
import OutletUsersTab from "../components/OutletUsersTab";
import DisplaysTab from "../components/DisplaysTab";
import OutletOrderHistoryTab from "../components/OutletOrderHistoryTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "menu", label: "Menu" },
  { key: "inventory", label: "Inventory" },
  { key: "kiosks", label: "Kiosks" },
  { key: "displays", label: "Displays" },
  { key: "users", label: "Users" },
  { key: "orders", label: "Orders" },
];

export default function OutletAdminPage() {
  const [activeSection, setActiveSection] = useState("overview");

  // Kiosks state
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [kiosksLoading, setKiosksLoading] = useState(false);
  const [kiosksError, setKiosksError] = useState("");
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);

  // Menu state
  const [menu, setMenu] = useState<MenuDetails | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState("");
  const menuFetched = useRef(false);

  // Load kiosks on mount
  useEffect(() => {
    loadKiosks();
  }, []);

  // Load menu when menu tab is first opened
  useEffect(() => {
    if (activeSection === "menu" && !menuFetched.current) {
      menuFetched.current = true;
      loadMenu();
    }
  }, [activeSection]);

  const loadKiosks = async () => {
    setKiosksLoading(true);
    setKiosksError("");
    try {
      const data = await fetchKiosks();
      setKiosks(data);
    } catch (err: unknown) {
      setKiosksError(err instanceof Error ? err.message : "Failed to fetch kiosks");
    } finally {
      setKiosksLoading(false);
    }
  };

  const loadMenu = async () => {
    setMenuLoading(true);
    setMenuError("");
    try {
      const data = await fetchMenuDetails();
      setMenu(data);
    } catch (err: unknown) {
      setMenuError(err instanceof Error ? err.message : "Failed to fetch menu");
    } finally {
      setMenuLoading(false);
    }
  };

  const handleKioskCreated = (newKiosk: Kiosk) => {
    setKiosks((prev) => [...prev, newKiosk]);
    // Keep modal open so user can see the login code countdown
  };

  const handleKioskToggled = (updated: Kiosk) => {
    setKiosks((prev) => prev.map((k) => (k._id === updated._id ? updated : k)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Outlet Admin Dashboard"
        subtitle="Manage kiosks and view your menu"
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <NavTabs tabs={TABS} active={activeSection} onChange={setActiveSection} />

        {/* ── Overview ── */}
        {activeSection === "overview" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Total Kiosks"
                value={kiosksLoading ? "..." : kiosks.length}
              />
              <StatCard
                label="Active Kiosks"
                value={kiosksLoading ? "..." : kiosks.filter((k) => k.status === "ACTIVE").length}
                color="green"
              />
              <StatCard
                label="Total Menu Items"
                value={menu ? menu.summary.totalItems : "—"}
              />
              <StatCard
                label="Active Items"
                value={menu ? menu.summary.activeItems : "—"}
                color="green"
              />
            </div>
          </div>
        )}

        {/* ── Menu ── */}
        {activeSection === "menu" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Menu</h2>
              <button
                onClick={() => { menuFetched.current = true; loadMenu(); }}
                className="text-sm text-blue-600 hover:underline"
                disabled={menuLoading}
              >
                {menuLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {menuError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-600 text-sm">{menuError}</p>
              </div>
            ) : null}

            {menuLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-500">Loading menu...</p>
              </div>
            ) : menu ? (
              <MenuGrid
                categories={menu.categories}
                filters={menu.filters}
                items={menu.items}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-500">No menu data available.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Inventory ── */}
        {activeSection === "inventory" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Inventory</h2>
              <p className="text-xs text-gray-400">Set outlet-level prices and quantities for each item.</p>
            </div>
            <InventoryTab />
          </div>
        )}

        {/* ── Kiosks ── */}
        {activeSection === "kiosks" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Kiosks
                {!kiosksLoading && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({kiosks.length})
                  </span>
                )}
              </h2>
              <button
                onClick={() => setIsKioskModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              >
                + Create Kiosk
              </button>
            </div>

            {kiosksError ? (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{kiosksError}</p>
              </div>
            ) : null}

            {kiosksLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-500">Loading kiosks...</p>
              </div>
            ) : kiosks.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-4xl mb-3">📟</p>
                <p className="text-gray-600 font-medium mb-1">No kiosks yet</p>
                <p className="text-sm text-gray-400 mb-4">
                  Create your first kiosk to get started.
                </p>
                <button
                  onClick={() => setIsKioskModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                  Create Kiosk
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kiosks.map((kiosk) => (
                  <KioskCard key={kiosk._id} kiosk={kiosk} onToggle={handleKioskToggled} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Displays ── */}
        {activeSection === "displays" && <DisplaysTab />}

        {/* ── Users ── */}
        {activeSection === "users" && <OutletUsersTab />}

        {/* ── Orders ── */}
        {activeSection === "orders" && <OutletOrderHistoryTab />}
      </main>

      {isKioskModalOpen && (
        <CreateKioskModal
          onClose={() => setIsKioskModalOpen(false)}
          onSuccess={handleKioskCreated}
        />
      )}
    </div>
  );
}
