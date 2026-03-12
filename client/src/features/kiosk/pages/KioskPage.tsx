import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { io } from "socket.io-client";
import {
  API_BASE_URL,
  fetchKioskMenu,
  fetchKioskInventory,
  fetchRecommendations,
  mergeMenuWithInventory,
  getKioskSession,
  clearKioskSession,
  type MenuCategory,
  type MenuFilter,
  type MenuItem,
  type EnrichedMenuItem,
  type RecommendedItemRef,
} from "../api";
import KioskScreen from "../components/KioskScreen";
import initKioskDB, { addItemsToCache, type CachedItem } from "../db/kioskDB";

type KioskData = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: EnrichedMenuItem[];
};

export default function KioskPage() {
  const navigate = useNavigate();
  const session = getKioskSession();
  const { t } = useTranslation("common");

  const [data, setData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendedIds, setRecommendedIds] = useState<RecommendedItemRef[]>([]);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  // Refs to allow stable access inside socket callbacks without stale closures
  const loadAllRef = useRef<() => Promise<void>>(async () => {});
  const dataRef = useRef<KioskData | null>(null);

  useEffect(() => {
    function preventBack() {
      history.pushState(null, "", location.href);
    }

    // to fix this problem , it is not working now
    preventBack();

    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, []);

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep refs pointing at latest copies to avoid stale closures in socket callbacks
  useEffect(() => { loadAllRef.current = loadAll; });
  useEffect(() => { dataRef.current = data; }, [data]);

  // ── IndexedDB init + socket inventory listener ────────────────────────────
  useEffect(() => {
    if (!session) return;

    initKioskDB()
      .then(() => {
        const socket = io(API_BASE_URL, { auth: { token: session.token } });

        socket.on("connect", () => {
          socket.emit("join:outlet", { outletId: session.kiosk.outlet.outletId });
        });

        socket.on(
          "inventory:update",
          (payload: {
            itemId: string;
            quantity?: number;
            status?: boolean;
            orderType?: "dineIn" | "takeAway" | "both";
          }) => {
            const { itemId, quantity, status, orderType } = payload;

            const currentData = dataRef.current;
            if (!currentData) return;

            const itemExists = currentData.items.some((i) => i._id === itemId);
            if (!itemExists) {
              // Unknown item — a new item was added to the outlet's inventory; re-fetch the menu
              loadAllRef.current().catch(console.error);
              return;
            }

            setData((prev) => {
              if (!prev) return prev;
              const updatedItems = prev.items.map((item) => {
                if (item._id !== itemId) return item;
                const newStockQty = quantity !== undefined ? quantity : item.stockQuantity;
                const newStatus  = status   !== undefined ? status   : item.status;
                const newOrderType = orderType !== undefined ? orderType : item.orderType;
                const newInStock = newStatus !== false && newStockQty > 0;
                return { ...item, stockQuantity: newStockQty, status: newStatus, inStock: newInStock, orderType: newOrderType };
              });
              return { ...prev, items: updatedItems };
            });
          },
        );

        socketRef.current = socket;
      })
      .catch(console.error);

    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
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

      // Fetch recommendations separately — non-blocking so the menu renders
      // immediately and the recommended section appears once the call resolves.
      fetchRecommendations().then(setRecommendedIds).catch(() => {});

      // Populate items_cache in IndexedDB on first load
      const toCache: CachedItem[] = menu.items.map((item: MenuItem) => ({
        _id: item._id,
        name: item.name,
        description: item.description,
        status: item.status,
        defaultAmount: item.defaultAmount,
        filters: item.filters.map((f) => f._id),
        category: item.category?._id ?? "",
        imageUrl: item.imageUrl,
        tenantId: session!.kiosk.tenant.tenantId,
      }));
      addItemsToCache(toCache).catch(console.error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load menu";
      if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid")) {
        clearKioskSession();
        navigate("/kiosk/login");
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
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-purple-600 font-medium">{t("loadingMenu")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="bg-white rounded-2xl shadow-md border border-purple-100 p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-gray-800 font-semibold mb-1">{t("failedToLoadMenu")}</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadAll}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl transition-colors"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!data || !session) return null;

  // Read orderType set on /kiosk/order-type; redirect there if missing (e.g. direct refresh)
  const orderType = sessionStorage.getItem("kioskOrderType") as "dineIn" | "takeAway" | null;
  if (!orderType) {
    navigate("/kiosk/order-type");
    return null;
  }

  /** Called by KioskScreen after checkout patches the IndexedDB cache. */
  const handleItemsPatched = (
    patches: Record<string, { price?: number; quantity?: number; status?: boolean; orderType?: "dineIn" | "takeAway" | "both" }>,
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((item) => {
        const patch = patches[item._id];
        if (!patch) return item;
        const displayPrice = patch.price !== undefined ? patch.price : item.displayPrice;
        const stockQuantity = patch.quantity !== undefined ? patch.quantity : item.stockQuantity;
        const status = patch.status !== undefined ? patch.status : item.status;
        const orderType = patch.orderType !== undefined ? patch.orderType : item.orderType;
        const inStock = status !== false && stockQuantity > 0;
        return { ...item, displayPrice, stockQuantity, inStock, status, orderType };
      });
      return { ...prev, items: updatedItems };
    });
  };

  /** Go back to start screen for a new order */
  const handleNewOrder = () => {
    sessionStorage.removeItem("kioskOrderType");
    navigate("/kiosk/start");
  };

  return (
    <KioskScreen
      categories={data.categories}
      filters={data.filters}
      items={data.items}
      outletName={session.kiosk.outlet.outletName}
      kioskNumber={session.kiosk.number}
      orderType={orderType}
      socketRef={socketRef}
      onItemsPatched={handleItemsPatched}
      onNewOrder={handleNewOrder}
      recommendedIds={recommendedIds}
    />
  );
}

