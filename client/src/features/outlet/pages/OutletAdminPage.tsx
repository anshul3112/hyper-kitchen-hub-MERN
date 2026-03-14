import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import AccessBlockedScreen from "../../../common/components/AccessBlockedScreen";
import DashboardHeader from "../../../common/components/DashboardHeader";
import NavTabs from "../../../common/components/NavTabs";
import StatCard from "../../../common/components/StatCard";
import { localised } from "../../../common/utils/languages";
import { fetchProfile } from "../../auth/api";
import { getBlockedAccessMessage, getErrorMessage, isBlockedAccessError } from "../../../common/utils/accessErrors";

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
import RecommendationsTab from "../components/RecommendationsTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "menu", label: "Menu" },
  { key: "inventory", label: "Inventory" },
  { key: "kiosks", label: "Kiosks" },
  { key: "recommendations", label: "Recommendations" },
  { key: "displays", label: "Displays" },
  { key: "users", label: "Users" },
  { key: "orders", label: "Orders" },
];

const SOCKET_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  "http://localhost:8000";

type LowStockAlert = {
  id: string;           // random id for keying + dismissal
  itemId: string;
  itemName: string;
  quantity: number;
  lowStockThreshold: number;
};

const getAlertItemName = (raw: unknown): string => {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const value = localised(raw as { en: string; [langCode: string]: string }, "en");
    if (value) return value;
  }
  return "Item";
};

export default function OutletAdminPage() {
  const [activeSection, setActiveSection] = useState("overview");

  // Low-stock alert toasts
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const socketRef = useRef<Socket | null>(null);

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
  const [accessBlockedMessage, setAccessBlockedMessage] = useState("");

  // Load kiosks on mount
  useEffect(() => {
    void initializePage();
  }, []);

  // ── Socket: low-stock alerts ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken") ?? "";
    const outletId = localStorage.getItem("outletId") ?? "";

    // If auth token is missing, skip socket connection to avoid noisy failed handshakes.
    if (!token || accessBlockedMessage) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (outletId) socket.emit("join:outlet", { outletId });
    });

    socket.on("inventory:low_stock", (payload: Omit<LowStockAlert, "id"> & { itemName: unknown }) => {
      const alert: LowStockAlert = {
        ...payload,
        itemName: getAlertItemName(payload.itemName),
        id: `${Date.now()}-${Math.random()}`,
      };
      setAlerts((prev) => {
        // Replace existing alert for the same item so we don't stack duplicates
        const filtered = prev.filter((a) => a.itemId !== payload.itemId);
        return [...filtered, alert];
      });
      // Auto-dismiss after 10 s
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      }, 10000);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessBlockedMessage]);

  // Load menu when menu tab is first opened
  useEffect(() => {
    if (accessBlockedMessage) return;
    if (activeSection === "menu" && !menuFetched.current) {
      menuFetched.current = true;
      loadMenu();
    }
  }, [activeSection, accessBlockedMessage]);

  const initializePage = async () => {
    setKiosksLoading(true);
    setMenuLoading(true);
    setKiosksError("");
    setMenuError("");

    try {
      await fetchProfile();
      const [kioskData, menuData] = await Promise.all([fetchKiosks(), fetchMenuDetails()]);
      setKiosks(kioskData);
      setMenu(menuData);
      menuFetched.current = true;
    } catch (err: unknown) {
      if (isBlockedAccessError(err)) {
        setAccessBlockedMessage(getBlockedAccessMessage(err, "Outlet access is disabled"));
        return;
      }

      const message = getErrorMessage(err, "Failed to load outlet dashboard");
      setKiosksError(message);
      setMenuError(message);
    } finally {
      setKiosksLoading(false);
      setMenuLoading(false);
    }
  };

  const loadMenu = async () => {
    if (accessBlockedMessage) return;
    setMenuLoading(true);
    setMenuError("");
    try {
      const data = await fetchMenuDetails();
      setMenu(data);
    } catch (err: unknown) {
      if (isBlockedAccessError(err)) {
        setAccessBlockedMessage(getBlockedAccessMessage(err, "Outlet access is disabled"));
        return;
      }
      setMenuError(getErrorMessage(err, "Failed to fetch menu"));
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

  const totalKiosks = kiosks.length;
  const activeKiosks = kiosks.filter((k) => k.status === "ACTIVE").length;
  const offlineKiosks = kiosks.filter((k) => k.status === "OFFLINE").length;
  const maintenanceKiosks = kiosks.filter((k) => k.status === "MAINTENANCE").length;
  const disabledKiosks = kiosks.filter((k) => k.status === "DISABLED").length;
  const activeKioskPercent = totalKiosks > 0 ? Math.round((activeKiosks / totalKiosks) * 100) : 0;

  const menuCoveragePercent = menu?.summary.totalItems
    ? Math.round((menu.summary.activeItems / menu.summary.totalItems) * 100)
    : 0;

  if (accessBlockedMessage) {
    return <AccessBlockedScreen title="Outlet dashboard unavailable" message={accessBlockedMessage} />;
  }

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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
                label="Offline Kiosks"
                value={kiosksLoading ? "..." : offlineKiosks}
                color="red"
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
              <StatCard
                label="Maintenance Kiosks"
                value={kiosksLoading ? "..." : maintenanceKiosks}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Kiosk Status Split</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Kiosk Active Rate</span>
                      <span className="font-semibold text-gray-800">{activeKioskPercent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${activeKioskPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 pt-1">
                    <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                      <p className="text-xs text-green-700">Active</p>
                      <p className="text-xl font-bold text-green-700">{activeKiosks}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                      <p className="text-xs text-red-700">Offline</p>
                      <p className="text-xl font-bold text-red-700">{offlineKiosks}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                      <p className="text-xs text-amber-700">Maintenance</p>
                      <p className="text-xl font-bold text-amber-700">{maintenanceKiosks}</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 border border-gray-200 p-3 text-center">
                      <p className="text-xs text-gray-700">Disabled</p>
                      <p className="text-xl font-bold text-gray-700">{disabledKiosks}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Menu Health</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600">Active Item Coverage</span>
                      <span className="font-semibold text-gray-800">{menu ? `${menuCoveragePercent}%` : "—"}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${menu ? menuCoveragePercent : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                      <p className="text-xs text-blue-700">Total</p>
                      <p className="text-xl font-bold text-blue-700">{menu?.summary.totalItems ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                      <p className="text-xs text-green-700">Active</p>
                      <p className="text-xl font-bold text-green-700">{menu?.summary.activeItems ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                      <p className="text-xs text-red-700">Inactive</p>
                      <p className="text-xl font-bold text-red-700">{menu?.summary.inactiveItems ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
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
            <InventoryTab socketRef={socketRef} />
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

        {/* ── Recommendations ── */}
        {activeSection === "recommendations" && <RecommendationsTab />}

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

      {/* ── Low-stock alert toasts ─────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 bg-orange-50 border border-orange-300 rounded-lg px-4 py-3 shadow-lg"
            >
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800">Low Stock Alert</p>
                <p className="text-sm text-orange-700 truncate">
                  <span className="font-medium">{alert.itemName}</span>
                  {" "}— only{" "}
                  <span className="font-bold">{alert.quantity}</span> left
                  {" "}(threshold: {alert.lowStockThreshold})
                </p>
              </div>
              <button
                onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                className="text-orange-400 hover:text-orange-700 text-lg leading-none shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
