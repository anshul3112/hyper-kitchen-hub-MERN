import { useState, useCallback } from "react";
import type { CartItem, EnrichedMenuItem } from "../api";

const CART_STORAGE_KEY = "kioskCart";

// ── Persistence helpers ───────────────────────────────────────────────────────

function loadCart(): Record<string, CartItem> {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CartItem>;
  } catch {
    return {};
  }
}

function saveCart(cart: Record<string, CartItem>) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCart() {
  const [cart, setCartState] = useState<Record<string, CartItem>>(loadCart);

  /** Apply a state update and immediately persist the result. */
  const update = useCallback((updater: (prev: Record<string, CartItem>) => Record<string, CartItem>) => {
    setCartState((prev) => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }, []);

  /** Add one of an item to cart, or create the entry if absent. */
  const addToCart = useCallback((item: EnrichedMenuItem) => {
    update((prev) => {
      const existing = prev[item._id];
      const entry: CartItem = existing
        ? { ...existing, quantity: existing.quantity + 1 }
        : {
            id: item._id,
            name: item.name,
            price: item.displayPrice,
            quantity: 1,
          };
      return { ...prev, [item._id]: entry };
    });
  }, [update]);

  /** Increment quantity of an existing cart entry. */
  const increment = useCallback((id: string) => {
    update((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return { ...prev, [id]: { ...existing, quantity: existing.quantity + 1 } };
    });
  }, [update]);

  /** Decrement quantity; removes the entry when it reaches 0. */
  const decrement = useCallback((id: string) => {
    update((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...existing, quantity: existing.quantity - 1 } };
    });
  }, [update]);

  /** Remove a specific item from the cart entirely. */
  const removeItem = useCallback((id: string) => {
    update((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [update]);

  /** Clear the whole cart. */
  const clearCart = useCallback(() => {
    update(() => ({}));
  }, [update]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const cartItems = Object.values(cart);

  const cartCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);

  const cartTotal = cartItems.reduce(
    (sum, entry) => sum + entry.price * entry.quantity,
    0
  );

  return {
    cart,
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    increment,
    decrement,
    removeItem,
    clearCart,
  };
}
