import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  API_BASE_URL,
  fetchKioskMenu,
  fetchKioskInventory,
  mergeMenuWithInventory,
  getKioskSession,
  clearKioskSession,
  type MenuCategory,
  type MenuFilter,
  type MenuItem,
  type EnrichedMenuItem,
} from "../api";
import KioskScreen from "../components/KioskScreen";
import initKioskDB, { addItemsToCache, upsertChangedItem, type CachedItem } from "../db/kioskDB";

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
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!session) {
      navigate("/kiosk/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          (data: {
            itemId: string;
            price?: number | null;
            quantity?: number;
            status?: boolean;
            orderType?: "dineIn" | "takeAway" | "both";
          }) => {
            upsertChangedItem({
              _id: data.itemId,
              price: data.price ?? undefined,
              quantity: data.quantity,
              status: data.status,
              orderType: data.orderType,
            }).catch(console.error);
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
          <p className="text-purple-600 font-medium">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="bg-white rounded-2xl shadow-md border border-purple-100 p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-gray-800 font-semibold mb-1">Failed to load menu</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadAll}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl transition-colors"
          >
            Retry
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
    />
  );
}

