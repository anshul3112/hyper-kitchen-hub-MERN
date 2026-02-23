import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchKioskMenu,
  fetchKioskInventory,
  mergeMenuWithInventory,
  getKioskSession,
  clearKioskSession,
  type MenuCategory,
  type MenuFilter,
  type EnrichedMenuItem,
} from "../api";
import KioskScreen from "../components/KioskScreen";

type KioskData = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: EnrichedMenuItem[];
};

export default function KioskPage() {
  const navigate = useNavigate();
  const session = getKioskSession();

  const [data, setData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login", { replace: true });
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch menu and inventory in parallel
      const [menu, inventory] = await Promise.all([
        fetchKioskMenu(),
        fetchKioskInventory(),
      ]);

      const enrichedItems = mergeMenuWithInventory(menu.items, inventory);

      setData({
        categories: menu.categories,
        filters: menu.filters,
        items: enrichedItems,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load menu";
      if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid")) {
        clearKioskSession();
        navigate("/kiosk/login", { replace: true });
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-gray-700 font-semibold mb-1">Failed to load menu</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadAll}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !session) return null;

  return (
    <KioskScreen
      categories={data.categories}
      filters={data.filters}
      items={data.items}
      outletName={session.kiosk.outlet.outletName}
      kioskNumber={session.kiosk.number}
    />
  );
}
