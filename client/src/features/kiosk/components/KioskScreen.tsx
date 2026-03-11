import { useState, useEffect, useRef, useMemo } from "react";
import type { Socket } from "socket.io-client";
import type { MenuCategory, MenuFilter, EnrichedMenuItem } from "../api";
import { placeOrder, fetchKioskInventory } from "../api";
import { useCart } from "../hooks/useCart";
import ComboUpgradeModal, { type ComboSuggestion } from "./ComboUpgradeModal";

type Props = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: EnrichedMenuItem[];
  outletName: string;
  kioskNumber: number;
  /** The order type selected by the customer on the pre-menu screen */
  orderType: "dineIn" | "takeAway";
  /** Socket.IO socket used to listen for order status events from the server. */
  socketRef: React.MutableRefObject<Socket | null>;
  /** Called after checkout applies inventory patches so KioskPage can re-render items live. */
  onItemsPatched: (patches: Record<string, { price?: number; quantity?: number; status?: boolean; orderType?: "dineIn" | "takeAway" | "both" }>) => void;
  /** Called when customer clicks "New Order" after a successful checkout — resets to welcome screen. */
  onNewOrder?: () => void;
};

export default function KioskScreen({
  categories,
  filters,
  items,
  orderType,
  socketRef,
  onItemsPatched,
  onNewOrder,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const { cart, cartCount, cartTotal, cartItems, addToCart, increment, decrement, removeItem, clearCart, patchCart } = useCart();

  // ── Checkout modal state ─────────────────────────────────────────────────────
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  type PayStep = "cart" | "payment" | "loading" | "success" | "error";
  const [payStep, setPayStep] = useState<PayStep>("cart");
  const [payerName, setPayerName] = useState("");
  const [upiId, setUpiId] = useState("");
  // Captured at submit time so the success screen can show the amount after cart is cleared
  const [submittedAmount, setSubmittedAmount] = useState(0);
  const [orderError, setOrderError] = useState("");
  const [orderErrorTitle, setOrderErrorTitle] = useState("Order Failed");
  // Tracks the correlationId returned by the server so we can match the WebSocket event
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  // ETA (minutes) received from the server in order:confirmed
  const [confirmedEta, setConfirmedEta] = useState<number | null>(null);

  // Notices generated at checkout-open time from pending changed_items
  const [checkoutNotices, setCheckoutNotices] = useState<string[]>([]);
  // True while openCheckout is processing IndexedDB — blocks Proceed to Pay
  const [checkoutInitializing, setCheckoutInitializing] = useState(false);

  const openCheckout = async () => {
    setPayStep("cart");
    setPayerName("");
    setUpiId("");
    setSubmittedAmount(0);
    setOrderError("");
    setOrderErrorTitle("Order Failed");
    setConfirmedEta(null);
    setCheckoutNotices([]);
    setCheckoutInitializing(true);
    setCheckoutOpen(true);

    try {
      const freshInventory = await fetchKioskInventory();
      const invMap = new Map(freshInventory.map((r) => [r.itemId, r]));

      const notices: string[] = [];
      // cartPatches: adjustments to apply to the in-memory cart (remove / clamp / price update)
      const cartPatches: Record<string, { price?: number; quantity?: number; status?: boolean }> = {};
      // menuPatches: updates to propagate to the parent items grid (all inventory items)
      const menuPatches: Record<string, { price?: number; quantity?: number; status?: boolean; orderType?: "dineIn" | "takeAway" | "both" }> = {};

      // Build menuPatches for every item we currently display
      for (const item of items) {
        const inv = invMap.get(item._id);
        if (!inv) continue;
        const freshPrice =
          (inv.activePrice != null ? inv.activePrice : null) ??
          inv.price ??
          item.defaultAmount;
        menuPatches[item._id] = {
          price: freshPrice,
          quantity: inv.quantity,
          status: inv.status,
          orderType: inv.orderType,
        };
      }

      // Validate each cart item against fresh inventory and build notices
      for (const cartItem of cartItems) {
        const inv = invMap.get(cartItem.id);

        if (!inv) {
          // Item no longer exists in inventory
          notices.push(`${cartItem.name} is no longer available — removed from cart.`);
          cartPatches[cartItem.id] = { status: false };
          continue;
        }

        if (inv.status === false) {
          notices.push(`${cartItem.name} is no longer available — removed from cart.`);
          cartPatches[cartItem.id] = { status: false };
          continue;
        }

        if (inv.quantity === 0) {
          notices.push(`${cartItem.name} is out of stock — removed from cart.`);
          cartPatches[cartItem.id] = { quantity: 0 };
          continue;
        }

        const patch: { price?: number; quantity?: number } = {};

        if (inv.quantity < cartItem.quantity) {
          notices.push(
            `${cartItem.name}: only ${inv.quantity} available — quantity reduced from ${cartItem.quantity} to ${inv.quantity}.`,
          );
          patch.quantity = inv.quantity;
        }

        const freshPrice =
          (inv.activePrice != null ? inv.activePrice : null) ??
          inv.price ??
          (items.find((i) => i._id === cartItem.id)?.defaultAmount ?? cartItem.price);

        if (freshPrice !== cartItem.price) {
          notices.push(
            `Price of ${cartItem.name} updated: \u20b9${cartItem.price} \u2192 \u20b9${freshPrice}.`,
          );
          patch.price = freshPrice;
        }

        if (Object.keys(patch).length > 0) {
          cartPatches[cartItem.id] = patch;
        }
      }

      // Apply cart adjustments (remove unavailable, clamp qty, update prices)
      if (Object.keys(cartPatches).length > 0) {
        patchCart(cartPatches);
      }

      // Propagate fresh prices + stock to the parent menu grid
      onItemsPatched(menuPatches);

      setCheckoutNotices(notices);
    } catch (err) {
      console.error("Failed to validate cart at checkout:", err);
    } finally {
      setCheckoutInitializing(false);
    }
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
  };

  const handlePlaceOrder = async () => {
    if (!payerName.trim() || !upiId.trim()) return;

    // Capture total before cart is cleared so the success screen can display it
    const total = cartTotal;
    setSubmittedAmount(total);
    setPayStep("loading");

    try {
      // Enqueues to SQS and returns 202 with a correlationId
      const { orderId } = await placeOrder({
        items: cartItems,
        totalAmount: total,
        paymentDetails: { name: payerName.trim(), upiId: upiId.trim() },
      });

      // Store the orderId so the WebSocket useEffect can match the server event.
      // The spinner keeps rotating until order:confirmed or order:failed arrives.
      setPendingOrderId(orderId);
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Something went wrong");
      setOrderErrorTitle("Order Failed");
      setPayStep("error");
    }
  };

  // ── WebSocket: wait for order:confirmed / order:failed ──────────────────
  useEffect(() => {
    if (!pendingOrderId) return;

    const socket = socketRef.current;

    if (!socket) {
      // Socket not yet connected (rare) — fall back to a generous timeout
      const fallback = setTimeout(() => {
        clearCart();
        setPendingOrderId(null);
        setPayStep("success");
      }, 10_000);
      return () => clearTimeout(fallback);
    }

    const handleConfirmed = (data: { orderId: string; orderNo?: number; estimatedPrepTime?: number }) => {
      if (data.orderId !== pendingOrderId) return; // belongs to a different kiosk
      clearCart();
      setPendingOrderId(null);
      setConfirmedEta(data.estimatedPrepTime ?? null);
      setPayStep("success");
    };

    const handleFailed = (data: {
      orderId: string;
      reason?: string;
      outOfStockItems?: string[];
    }) => {
      if (data.orderId !== pendingOrderId) return;
      setPendingOrderId(null);
      if (data.reason === "out_of_stock" && data.outOfStockItems?.length) {
        const names = data.outOfStockItems.join(", ");
        setOrderErrorTitle("Out of Stock");
        setOrderError(
          data.outOfStockItems.length === 1
            ? `${names} is out of stock.`
            : `The following items are out of stock: ${names}.`
        );
      } else {
        setOrderErrorTitle("Payment Failed");
        setOrderError("Payment failed. Please try again.");
      }
      setPayStep("error");
    };

    socket.on("order:confirmed", handleConfirmed);
    socket.on("order:failed", handleFailed);

    return () => {
      socket.off("order:confirmed", handleConfirmed);
      socket.off("order:failed", handleFailed);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOrderId]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Stock-limited add / increment ─────────────────────────────────────────
  const handleAddToCart = (item: EnrichedMenuItem) => {
    const qty = cart[item._id]?.quantity ?? 0;
    if (qty >= item.stockQuantity) {
      showToast(`Only ${item.stockQuantity} of "${item.name}" available`);
      return;
    }
    addToCart(item);
  };

  const handleIncrement = (item: EnrichedMenuItem) => {
    const qty = cart[item._id]?.quantity ?? 0;
    if (qty >= item.stockQuantity) {
      showToast(`Only ${item.stockQuantity} of "${item.name}" available`);
      return;
    }
    increment(item._id);
  };

  // ── Combo suggestion logic ─────────────────────────────────────────────────
  const [comboDismissed, setComboDismissed] = useState(false);
  const prevComboCountRef = useRef(0);

  const comboSuggestions = useMemo<ComboSuggestion[]>(() => {
    const cartItemIds = new Set(cartItems.map((ci) => ci.id));
    if (cartItemIds.size === 0) return [];

    const suggestions: ComboSuggestion[] = [];
    for (const item of items) {
      if (item.type !== 'combo') continue;
      if (!item.inStock) continue;
      // NOTE: we intentionally keep showing the suggestion even when the combo
      // is already in the cart — the customer may have added standalone component
      // items on top of an existing combo and could bundle them again.
      const comboItemIds = item.comboItems ?? [];
      const matchingItemIds = comboItemIds.filter((id) => cartItemIds.has(id));
      if (matchingItemIds.length >= (item.minMatchCount ?? 1)) {
        // savings = sum of individual unit prices for all combo items vs combo price
        const individualTotal = comboItemIds.reduce((sum, id) => {
          const found = items.find((i) => i._id === id);
          return sum + (found?.displayPrice ?? 0);
        }, 0);
        const savings = Math.max(0, individualTotal - item.displayPrice);
        if(savings > 0)
        suggestions.push({ combo: item, matchingItemIds, savings });
      }
    }
    return suggestions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, items]);

  // Re-show modal whenever the number of suggestions grows (new combo unlocked)
  useEffect(() => {
    if (comboSuggestions.length > prevComboCountRef.current) {
      setComboDismissed(false);
    }
    prevComboCountRef.current = comboSuggestions.length;
  }, [comboSuggestions]);

  /** Replace matched individual items in cart with the combo item. */
  const handleUpgradeToCombo = (suggestion: { combo: EnrichedMenuItem; matchingItemIds: string[] }) => {
    suggestion.matchingItemIds.forEach((id) => removeItem(id));
    addToCart(suggestion.combo);
    showToast(`Upgraded to ${suggestion.combo.name}! 🎉`);
  };

  const visibleItems = items.filter((item) => {
    // Filter by order type: show items tagged 'both' or matching the selected type
    const matchesOrderType =
      item.orderType === "both" || item.orderType === orderType;
    if (!matchesOrderType) return false;

    // Hide outlet-disabled items that the customer hasn't already added to their cart.
    // Items that are simply out of stock (status=true, qty=0) are still displayed
    // with an "Out of Stock" overlay — disabled-by-admin items disappear entirely.
    if (item.status === false && !cart[item._id]) return false;

    if (selectedCategory !== "all") {
      if (item.category?._id !== selectedCategory) return false;
    }
    if (selectedFilter !== "all") {
      if (!item.filters.some((f) => f._id === selectedFilter)) return false;
    }
    return true;
  });

  // Only show categories that have at least one item assigned to them (respecting orderType)
  const populatedCategoryIds = new Set(
    items
      .filter((item) => item.orderType === "both" || item.orderType === orderType)
      .map((item) => item.category?._id)
      .filter(Boolean)
  );
  const activeCategories = categories.filter((cat) => populatedCategoryIds.has(cat._id));

  // Only show filters that are used by at least one item (respecting orderType)
  const populatedFilterIds = new Set(
    items
      .filter((item) => item.orderType === "both" || item.orderType === orderType)
      .flatMap((item) => item.filters.map((f) => f._id))
  );
  const activeFilters = filters.filter((f) => populatedFilterIds.has(f._id));

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 py-3 flex-shrink-0">
        {/* Left: Order type badge + Start Over */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            orderType === "dineIn"
              ? "bg-green-100 text-green-700"
              : "bg-purple-100 text-purple-700"
          }`}>
            {orderType === "dineIn" ? "🍽️ Dine In" : "🛍️ Take Away"}
          </span>
          <button
            onClick={() => { clearCart(); onNewOrder?.(); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 bg-white px-3 py-1.5 rounded-full transition-colors"
          >
            ↺ Start Over
          </button>
        </div>

        {/* Center: Filter chips */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              selectedFilter === "all"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600"
            }`}
          >
            All
          </button>
          {activeFilters.map((f) => (
            <button
              key={f._id}
              onClick={() =>
                setSelectedFilter(f._id === selectedFilter ? "all" : f._id)
              }
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedFilter === f._id
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-600"
              }`}
            >
              {f.imageUrl && (
                <img
                  src={f.imageUrl}
                  alt=""
                  className="w-4 h-4 rounded object-cover flex-shrink-0"
                />
              )}
              {f.name}
            </button>
          ))}
        </div>

        {/* Right: Cart summary + Checkout */}
        <div className="flex items-center gap-3">
          {cartCount > 0 ? (
            <>
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2">
                <span className="text-purple-700 text-sm font-bold">
                  🛒 {cartCount} item{cartCount > 1 ? "s" : ""}
                </span>
                <span className="text-purple-700 font-bold text-sm">— ₹{cartTotal}</span>
              </div>
              <button
                onClick={openCheckout}
                className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all shadow-sm"
              >
                Checkout →
              </button>
            </>
          ) : (
            <div className="text-gray-400 text-sm">Cart is empty</div>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar: Categories ─────────────────────────────────── */}
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
            Categories
          </p>

          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors text-left ${
              selectedCategory === "all"
                ? "bg-purple-50 text-purple-700 border-r-2 border-purple-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-base">🍽️</span>
            <span>All Items</span>
          </button>

          {activeCategories.map((cat) => (
            <button
              key={cat._id}
              onClick={() =>
                setSelectedCategory(cat._id === selectedCategory ? "all" : cat._id)
              }
              className={`flex flex-col w-full text-left overflow-hidden transition-colors flex-shrink-0 ${
                selectedCategory === cat._id
                  ? "bg-purple-50 text-purple-700 border-r-2 border-purple-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {cat.imageUrl && (
                <div className="w-full h-[138px] bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className={`flex items-center gap-2 px-4 text-sm font-medium ${cat.imageUrl ? "py-2" : "py-3"}`}>
                {!cat.imageUrl && <span className="text-base flex-shrink-0">🍴</span>}
                <span className="line-clamp-2 leading-tight">{cat.name}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* ── Main Content: Item Grid ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5">

          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <p className="text-5xl mb-4">🍽️</p>
              <p className="text-base font-medium">No items in this category</p>
              <p className="text-sm mt-1">Try selecting a different category or filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {visibleItems.map((item) => {
                const qty = cart[item._id]?.quantity ?? 0;
                return (
                  <div
                    key={item._id}
                    className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col border ${
                      item.inStock ? "border-gray-100" : "border-gray-200 opacity-70"
                    }`}
                  >
                    {/* Image */}
                    <div className="relative h-[173px] bg-white flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className={`w-full h-full object-contain ${!item.inStock ? "grayscale" : ""}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-6xl">{item.inStock ? "🍴" : "🚫"}</span>
                        </div>
                      )}

                      {/* Out of stock overlay */}
                      {!item.inStock && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="bg-white/90 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}

                      {/* Filter badges */}
                      {item.filters.length > 0 && item.inStock && (
                        <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[90%]">
                          {item.filters.slice(0, 2).map((f) => (
                            <span
                              key={f._id}
                              className="bg-white/90 text-purple-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm"
                            >
                              {f.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Low stock warning */}
                      {item.inStock && item.stockQuantity <= 5 && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            Only {item.stockQuantity} left
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4 flex flex-col gap-1 flex-1">
                      <p className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      {item.type === 'combo' && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                           Combo
                        </span>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 leading-snug">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                        <span className="text-lg font-extrabold text-gray-900">
                          ₹{item.displayPrice}
                        </span>

                        {/* Add to Cart / Quantity Control */}
                        {!item.inStock ? (
                          <span className="flex-1 text-center text-sm font-semibold text-gray-400 bg-gray-100 py-2 px-2 rounded-xl">
                            Unavailable
                          </span>
                        ) : qty === 0 ? (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm font-bold py-2 px-3 rounded-xl transition-all"
                          >
                            Add to Cart
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-xl px-1 py-0.5">
                            <button
                              onClick={() => decrement(item._id)}
                              className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-base flex items-center justify-center hover:bg-purple-700 active:scale-95 transition-all"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-base font-bold text-purple-700">
                              {qty}
                            </span>
                            <button
                              onClick={() => handleIncrement(item)}
                              disabled={qty >= item.stockQuantity}
                              className={`w-7 h-7 rounded-lg text-white font-bold text-base flex items-center justify-center transition-all ${
                                qty >= item.stockQuantity
                                  ? "bg-purple-300 cursor-not-allowed"
                                  : "bg-purple-600 hover:bg-purple-700 active:scale-95"
                              }`}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Combo Upgrade Modal (right-side floating panel) ─────────────── */}
      {!comboDismissed && (
        <ComboUpgradeModal
          suggestions={comboSuggestions}
          onUpgrade={(s) => { handleUpgradeToCombo(s); }}
          onClose={() => setComboDismissed(true)}
        />
      )}

      {/* ── Checkout Modal ─────────────────────────────────────────────────── */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">

            {/* ── STEP: Cart Review ───────────────────────────────────────── */}
            {payStep === "cart" && (
              <>
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">🛒 Your Order</h2>
                  <button onClick={closeCheckout} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
                </div>

                {/* Inventory change notices */}
                {checkoutNotices.length > 0 && (
                  <div className="mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 space-y-1">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">⚠️ Price / Stock Updates</p>
                    {checkoutNotices.map((msg, i) => (
                      <p key={i} className="text-xs text-amber-800 leading-snug">{msg}</p>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400">₹{item.price} × {item.quantity}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-900">₹{item.price * item.quantity}</span>
                    </div>
                  ))}

                  {/* Combo upgrade suggestions */}
                  {comboSuggestions.length > 0 && (
                    <div className="mt-2 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 space-y-3">
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">💡 Upgrade Suggestions</p>
                      {comboSuggestions.map((s) => (
                        <div key={s.combo._id} className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">
                               {s.combo.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₹{s.combo.displayPrice}
                              {s.savings > 0 && (
                                <span className="ml-1.5 text-green-600 font-semibold">· Save ₹{s.savings}</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleUpgradeToCombo(s)}
                            className="flex-shrink-0 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Upgrade →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100">
                  {checkoutInitializing ? (
                    /* Still applying inventory patches — block proceed */
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-purple-300 cursor-not-allowed text-white font-bold py-3 rounded-2xl text-base"
                    >
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Checking stock…
                    </button>
                  ) : cartItems.length === 0 ? (
                    /* All items were removed by inventory patches */
                    <div className="space-y-3">
                      <p className="text-center text-sm text-gray-500">Your cart is empty — all items were removed due to stock or availability changes.</p>
                      <button
                        onClick={closeCheckout}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-2xl transition-all text-base"
                      >
                        Back to Menu
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-base font-semibold text-gray-600">Total</span>
                        <span className="text-xl font-extrabold text-gray-900">₹{cartTotal}</span>
                      </div>
                      <button
                        onClick={() => setPayStep("payment")}
                        className="w-full bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition-all text-base"
                      >
                        Proceed to Pay →
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── STEP: Payment Form ─────────────────────────────────────── */}
            {payStep === "payment" && (
              <>
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">💳 Payment Details</h2>
                  <button onClick={closeCheckout} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="e.g. Raj Kumar"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. raj@upi"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Total to pay: <span className="font-bold text-gray-700">₹{cartTotal}</span></p>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setPayStep("cart")}
                    className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-all text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!payerName.trim() || !upiId.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition-all text-sm"
                  >
                    Place Order
                  </button>
                </div>
              </>
            )}

            {/* ── STEP: Loading ────────────────────────────────────────────── */}
            {payStep === "loading" && (
              <div className="flex flex-col items-center justify-center py-16 px-6 gap-5">
                <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">Processing Payment…</p>
                  <p className="text-sm text-gray-400 mt-1">Please do not close this window</p>
                </div>
              </div>
            )}

            {/* ── STEP: Success ───────────────────────────────────────────── */}
            {payStep === "success" && (
              <div className="flex flex-col items-center justify-center py-12 px-6 gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900">Order Placed!</p>
                  <p className="text-sm text-gray-500 mt-2">Your order is being prepared</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Amount paid: <span className="font-semibold">₹{submittedAmount}</span>
                  </p>
                  {confirmedEta != null && confirmedEta > 0 && (() => {
                    const lo = confirmedEta;
                    const rawHi = Math.ceil(confirmedEta * 1.5);
                    const hi = rawHi > 30 && rawHi % 5 !== 0 ? Math.ceil(rawHi / 5) * 5 : rawHi;
                    return (
                      <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                        <span className="text-lg">⏱️</span>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Estimated wait</p>
                          <p className="text-base font-extrabold text-amber-900">
                            {lo === hi ? `${lo} min` : `${lo}–${hi} min`}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => { closeCheckout(); onNewOrder?.(); }}
                  className="mt-2 w-full bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition-all text-base"
                >
                  New Order
                </button>
              </div>
            )}

            {/* ── STEP: Error ─────────────────────────────────────────────── */}
            {payStep === "error" && (
              <div className="flex flex-col items-center justify-center py-12 px-6 gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-3xl">❌</span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900">{orderErrorTitle}</p>
                  <p className="text-sm text-red-500 mt-2">{orderError}</p>
                </div>
                <div className="w-full flex gap-3">
                  <button
                    onClick={() => setPayStep("payment")}
                    className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-all text-sm"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={closeCheckout}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-2xl transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gray-900/90 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
            <span className="text-base">⚠️</span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
