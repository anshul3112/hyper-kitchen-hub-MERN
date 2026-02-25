import { useState, useEffect, useRef } from "react";
import type { MenuCategory, MenuFilter, EnrichedMenuItem, OrderResult } from "../api";
import { placeOrder } from "../api";
import { useCart } from "../hooks/useCart";
import { getChangedItems, patchItemsInCache, clearChangedItems } from "../db/kioskDB";

type Props = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: EnrichedMenuItem[];
  outletName: string;
  kioskNumber: number;
  /** Called after checkout applies inventory patches so KioskPage can re-render items live. */
  onItemsPatched: (patches: Record<string, { price?: number; quantity?: number; status?: boolean }>) => void;
};

export default function KioskScreen({
  categories,
  filters,
  items,
  outletName,
  onItemsPatched,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const { cart, cartCount, cartTotal, cartItems, addToCart, increment, decrement, clearCart, patchCart } = useCart();

  // ── Checkout modal state ─────────────────────────────────────────────────────
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  type PayStep = "cart" | "payment" | "loading" | "success" | "error";
  const [payStep, setPayStep] = useState<PayStep>("cart");
  const [payerName, setPayerName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState("");

  // Notices generated at checkout-open time from pending changed_items
  const [checkoutNotices, setCheckoutNotices] = useState<string[]>([]);
  // True while openCheckout is processing IndexedDB — blocks Proceed to Pay
  const [checkoutInitializing, setCheckoutInitializing] = useState(false);

  const openCheckout = async () => {
    setPayStep("cart");
    setPayerName("");
    setUpiId("");
    setOrderResult(null);
    setOrderError("");
    setCheckoutNotices([]);
    setCheckoutInitializing(true);
    setCheckoutOpen(true);

    try {
      const changes = await getChangedItems();
      if (changes.length === 0) return;

      // Build a patches map keyed by itemId
      const patches: Record<string, { price?: number; quantity?: number; status?: boolean }> = {};
      changes.forEach((c) => {
        patches[c._id] = { price: c.price, quantity: c.quantity, status: c.status };
      });

      // Build notices for items that are actually in the cart
      const notices: string[] = [];
      for (const cartItem of cartItems) {
        const patch = patches[cartItem.id];
        if (!patch) continue;

        if (patch.status === false) {
          notices.push(`${cartItem.name} is no longer available — removed from cart.`);
          continue; // no further checks needed; item is gone
        }

        if (patch.quantity === 0) {
          notices.push(`${cartItem.name} is out of stock — removed from cart.`);
          continue;
        }

        if (patch.quantity !== undefined && patch.quantity < cartItem.quantity) {
          notices.push(
            `${cartItem.name}: only ${patch.quantity} available — quantity reduced from ${cartItem.quantity} to ${patch.quantity}.`,
          );
        }

        if (patch.price !== undefined && patch.price !== cartItem.price) {
          notices.push(
            `Price of ${cartItem.name} updated: \u20b9${cartItem.price} \u2192 \u20b9${patch.price}.`,
          );
        }
      }

      // 1. Clamp / update the cart in-place
      patchCart(patches);

      // 2. Patch items_cache in IndexedDB
      await patchItemsInCache(changes);

      // 3. Consume changed_items queue
      await clearChangedItems();

      // 4. Tell parent to re-render the item grid with fresh prices/stock
      onItemsPatched(patches);

      setCheckoutNotices(notices);
    } catch (err) {
      console.error("Failed to apply inventory changes at checkout:", err);
    } finally {
      setCheckoutInitializing(false);
    }
  };

  // Silently drain changed_items and sync cart + item grid on close — no notices shown.
  const applyPatchesSilently = async () => {
    try {
      const changes = await getChangedItems();
      if (changes.length === 0) return;

      const patches: Record<string, { price?: number; quantity?: number; status?: boolean }> = {};
      changes.forEach((c) => {
        patches[c._id] = { price: c.price, quantity: c.quantity, status: c.status };
      });

      patchCart(patches);
      await patchItemsInCache(changes);
      await clearChangedItems();
      onItemsPatched(patches);
    } catch (err) {
      console.error("Failed to apply silent inventory patches on close:", err);
    }
  };

  const closeCheckout = async () => {
    await applyPatchesSilently();
    setCheckoutOpen(false);
  };

  const handlePlaceOrder = async () => {
    if (!payerName.trim() || !upiId.trim()) return;
    setPayStep("loading");
    try {
      const result = await placeOrder({
        items: cartItems,
        totalAmount: cartTotal,
        paymentDetails: { name: payerName.trim(), upiId: upiId.trim() },
      });
      setOrderResult(result);
      setPayStep("success");
      clearCart();
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Something went wrong");
      setPayStep("error");
    }
  };

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

  const visibleItems = items.filter((item) => {
    if (selectedCategory !== "all") {
      if (item.category?._id !== selectedCategory) return false;
    }
    if (selectedFilter !== "all") {
      if (!item.filters.some((f) => f._id === selectedFilter)) return false;
    }
    return true;
  });

  // Only show categories that have at least one item assigned to them
  const populatedCategoryIds = new Set(
    items.map((item) => item.category?._id).filter(Boolean)
  );
  const activeCategories = categories.filter((cat) => populatedCategoryIds.has(cat._id));

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 py-3 flex-shrink-0">
        {/* Left: Brand info */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">{outletName}</p>
          </div>
        </div>

        {/* Center: Filter chips */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              selectedFilter === "all"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-500"
            }`}
          >
            All
          </button>
          {filters.map((f) => (
            <button
              key={f._id}
              onClick={() =>
                setSelectedFilter(f._id === selectedFilter ? "all" : f._id)
              }
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedFilter === f._id
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-500"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Right: Cart summary + Checkout */}
        <div className="flex items-center gap-3">
          {cartCount > 0 ? (
            <>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
                <span className="text-orange-600 text-sm font-bold">
                  🛒 {cartCount} item{cartCount > 1 ? "s" : ""}
                </span>
                <span className="text-orange-700 font-bold text-sm">— ₹{cartTotal}</span>
              </div>
              <button
                onClick={openCheckout}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all shadow-sm"
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
        <aside className="w-44 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
            Categories
          </p>

          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors text-left ${
              selectedCategory === "all"
                ? "bg-blue-50 text-blue-600 border-r-2 border-blue-500"
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
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors text-left ${
                selectedCategory === cat._id
                  ? "bg-blue-50 text-blue-600 border-r-2 border-blue-500"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {cat.imageUrl ? (
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-5 h-5 rounded object-cover flex-shrink-0"
                />
              ) : (
                <span className="text-base">🍴</span>
              )}
              <span className="line-clamp-2 leading-tight">{cat.name}</span>
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
                    <div className="relative h-36 bg-white flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className={`w-full h-full object-contain ${!item.inStock ? "grayscale" : ""}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl">{item.inStock ? "🍴" : "🚫"}</span>
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
                              className="bg-white/90 text-orange-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm"
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
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-snug">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                        <span className="text-base font-extrabold text-gray-900">
                          ₹{item.displayPrice}
                        </span>

                        {/* Add to Cart / Quantity Control */}
                        {!item.inStock ? (
                          <span className="flex-1 text-center text-xs font-semibold text-gray-400 bg-gray-100 py-1.5 px-2 rounded-xl">
                            Unavailable
                          </span>
                        ) : qty === 0 ? (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold py-1.5 px-2 rounded-xl transition-all"
                          >
                            Add to Cart
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-xl px-1 py-0.5">
                            <button
                              onClick={() => decrement(item._id)}
                              className="w-6 h-6 rounded-lg bg-orange-500 text-white font-bold text-sm flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-orange-700">
                              {qty}
                            </span>
                            <button
                              onClick={() => handleIncrement(item)}
                              className="w-6 h-6 rounded-lg bg-orange-500 text-white font-bold text-sm flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all"
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
                </div>

                <div className="px-6 py-4 border-t border-gray-100">
                  {checkoutInitializing ? (
                    /* Still applying inventory patches — block proceed */
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-orange-300 cursor-not-allowed text-white font-bold py-3 rounded-2xl text-base"
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
                        className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition-all text-base"
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
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. raj@upi"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition-all text-sm"
                  >
                    Place Order
                  </button>
                </div>
              </>
            )}

            {/* ── STEP: Loading ────────────────────────────────────────────── */}
            {payStep === "loading" && (
              <div className="flex flex-col items-center justify-center py-16 px-6 gap-5">
                <div className="w-14 h-14 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-base font-bold text-gray-800">Processing Payment…</p>
                  <p className="text-sm text-gray-400 mt-1">Please do not close this window</p>
                </div>
              </div>
            )}

            {/* ── STEP: Success ───────────────────────────────────────────── */}
            {payStep === "success" && orderResult && (
              <div className="flex flex-col items-center justify-center py-12 px-6 gap-5 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900">Order Placed!</p>
                  <p className="text-3xl font-black text-orange-500 mt-1">#{orderResult.orderNo}</p>
                  <p className="text-sm text-gray-500 mt-2">Payment: <span className="font-semibold text-green-600">{orderResult.paymentStatus}</span></p>
                  <p className="text-sm text-gray-500">Amount paid: <span className="font-semibold">₹{orderResult.totalAmount}</span></p>
                </div>
                <button
                  onClick={closeCheckout}
                  className="mt-2 w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3 rounded-2xl transition-all text-base"
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
                  <p className="text-xl font-extrabold text-gray-900">Payment Failed</p>
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
