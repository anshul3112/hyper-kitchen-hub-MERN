import { useEffect, useState } from "react";
import {
  fetchOutletInventory,
  fetchMenuDetails,
  upsertInventoryItem,
  updateInventoryPrice,
  updateInventoryQuantity,
  toggleInventoryStatus,
  updateInventoryOrderType,
  updateInventoryThreshold,
  type InventoryRecord,
  type MenuItem,
} from "../api";

// ── types ─────────────────────────────────────────────────────────────────────

type EditMode = "price" | "quantity" | "both" | null;

type RowState = {
  editMode: EditMode;
  priceInput: string;
  quantityInput: string;
  saving: boolean;
  toggling: boolean;
  error: string;
  orderTypeUpdating: boolean;
  orderTypeError: string;
  // threshold editing
  thresholdEditing: boolean;
  thresholdInput: string;
  thresholdSaving: boolean;
  thresholdError: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function emptyRow(): RowState {
  return {
    editMode: null,
    priceInput: "",
    quantityInput: "",
    saving: false,
    toggling: false,
    error: "",
    orderTypeUpdating: false,
    orderTypeError: "",
    thresholdEditing: false,
    thresholdInput: "",
    thresholdSaving: false,
    thresholdError: "",
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function InventoryTab() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryRecord>>({});
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [menuData, inventoryData] = await Promise.all([
        fetchMenuDetails(),
        fetchOutletInventory(),
      ]);
      setItems(menuData.items);
      const map: Record<string, InventoryRecord> = {};
      inventoryData.forEach((r) => { map[r.itemId as string] = r; });
      setInventoryMap(map);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const getRow = (itemId: string): RowState => rows[itemId] ?? emptyRow();

  const setRow = (itemId: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [itemId]: { ...getRow(itemId), ...patch } }));

  const openEdit = (itemId: string, mode: EditMode) => {
    const inv = inventoryMap[itemId];
    setRow(itemId, {
      editMode: mode,
      priceInput: inv ? String(inv.price) : "",
      quantityInput: inv ? String(inv.quantity) : "",
      error: "",
    });
  };

  const cancelEdit = (itemId: string) => setRow(itemId, emptyRow());

  const toggle = async (itemId: string, newStatus: boolean) => {
    setRow(itemId, { toggling: true, error: "" });
    try {
      const updated = await toggleInventoryStatus(itemId, newStatus);
      setInventoryMap((prev) => ({ ...prev, [itemId]: updated }));
      setRow(itemId, { toggling: false });
    } catch (err: unknown) {
      setRow(itemId, { toggling: false, error: err instanceof Error ? err.message : "Failed to toggle" });
    }
  };

  const changeOrderType = async (itemId: string, orderType: 'dineIn' | 'takeAway' | 'both') => {
    setRow(itemId, { orderTypeUpdating: true, orderTypeError: "" });
    try {
      const updated = await updateInventoryOrderType(itemId, orderType);
      setInventoryMap((prev) => ({ ...prev, [itemId]: updated }));
      setRow(itemId, { orderTypeUpdating: false });
    } catch (err: unknown) {
      setRow(itemId, {
        orderTypeUpdating: false,
        orderTypeError: err instanceof Error ? err.message : "Failed to update order type",
      });
    }
  };

  const save = async (itemId: string) => {
    const row = getRow(itemId);
    const price = parseFloat(row.priceInput);
    const quantity = parseInt(row.quantityInput, 10);

    if (row.editMode === "price" || row.editMode === "both") {
      if (isNaN(price) || price < 0) {
        setRow(itemId, { error: "Price must be a non-negative number" });
        return;
      }
    }
    if (row.editMode === "quantity" || row.editMode === "both") {
      if (isNaN(quantity) || quantity < 0) {
        setRow(itemId, { error: "Quantity must be a non-negative integer" });
        return;
      }
    }

    setRow(itemId, { saving: true, error: "" });
    try {
      let updated: InventoryRecord;
      if (row.editMode === "both") {
        updated = await upsertInventoryItem(itemId, price, quantity);
      } else if (row.editMode === "price") {
        updated = await updateInventoryPrice(itemId, price);
      } else {
        updated = await updateInventoryQuantity(itemId, quantity);
      }
      setInventoryMap((prev) => ({ ...prev, [itemId]: updated }));
      setRow(itemId, emptyRow());
    } catch (err: unknown) {
      setRow(itemId, { saving: false, error: err instanceof Error ? err.message : "Failed to save" });
    }
  };

  const openThresholdEdit = (itemId: string) => {
    const inv = inventoryMap[itemId];
    setRow(itemId, {
      thresholdEditing: true,
      thresholdInput: inv?.lowStockThreshold != null ? String(inv.lowStockThreshold) : "",
      thresholdError: "",
    });
  };

  const cancelThresholdEdit = (itemId: string) =>
    setRow(itemId, { thresholdEditing: false, thresholdInput: "", thresholdError: "" });

  const saveThreshold = async (itemId: string) => {
    const row = getRow(itemId);
    const raw = row.thresholdInput.trim();
    const value = raw === "" ? null : parseInt(raw, 10);

    if (value !== null && (isNaN(value) || value < 0)) {
      setRow(itemId, { thresholdError: "Must be a non-negative whole number (or blank to disable)" });
      return;
    }

    setRow(itemId, { thresholdSaving: true, thresholdError: "" });
    try {
      const updated = await updateInventoryThreshold(itemId, value);
      setInventoryMap((prev) => ({ ...prev, [itemId]: updated }));
      setRow(itemId, { thresholdEditing: false, thresholdSaving: false, thresholdInput: "" });
    } catch (err: unknown) {
      setRow(itemId, {
        thresholdSaving: false,
        thresholdError: err instanceof Error ? err.message : "Failed to save threshold",
      });
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-500">Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={load} className="mt-2 text-sm text-red-600 underline">Retry</button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-500">No menu items found. Add items from the tenant admin first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Item</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Default Price</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Outlet Price</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Quantity</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Low-Stock Alert</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Kiosk Visible</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Order Type</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const inv = inventoryMap[item._id];
              const row = getRow(item._id);
              const isEditing = row.editMode !== null;

              return (
                <tr key={item._id} className={isEditing ? "bg-blue-50" : "hover:bg-gray-50"}>
                  {/* Item name */}
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {item.status ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Default price (from item master) */}
                  <td className="px-5 py-3 text-gray-500">₹{item.defaultAmount}</td>

                  {/* Outlet price */}
                  <td className="px-5 py-3">
                    {isEditing && (row.editMode === "price" || row.editMode === "both") ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.priceInput}
                        onChange={(e) => setRow(item._id, { priceInput: e.target.value })}
                        className="w-24 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus={row.editMode === "price"}
                      />
                    ) : inv && inv.price != null ? (
                      <span className="font-semibold text-gray-800">₹{inv.price}</span>
                    ) : (
                      <span className="text-gray-500 text-xs">
                        ₹{item.defaultAmount}
                        <span className="ml-1 text-gray-400 italic">(default)</span>
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-5 py-3">
                    {isEditing && (row.editMode === "quantity" || row.editMode === "both") ? (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row.quantityInput}
                        onChange={(e) => setRow(item._id, { quantityInput: e.target.value })}
                        className="w-20 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus={row.editMode === "quantity"}
                      />
                    ) : inv ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${inv.quantity === 0 ? "text-red-500" : "text-gray-800"}`}>
                          {inv.quantity}
                        </span>
                        {inv.lowStockThreshold != null && inv.quantity <= inv.lowStockThreshold && (
                          <span
                            title={`Low stock! Threshold is ${inv.lowStockThreshold}`}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
                          >
                            ⚠ Low
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-red-400 text-xs font-medium">0 (not set)</span>
                    )}
                  </td>

                  {/* Low-Stock Alert Threshold */}
                  <td className="px-5 py-3">
                    {row.thresholdEditing ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="e.g. 5"
                          value={row.thresholdInput}
                          onChange={(e) => setRow(item._id, { thresholdInput: e.target.value })}
                          className="w-20 px-2 py-1 border border-orange-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                          autoFocus
                        />
                        {row.thresholdError && (
                          <p className="text-xs text-red-500">{row.thresholdError}</p>
                        )}
                        <div className="flex gap-1 mt-0.5">
                          <button
                            onClick={() => saveThreshold(item._id)}
                            disabled={row.thresholdSaving}
                            className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
                          >
                            {row.thresholdSaving ? "..." : "Set"}
                          </button>
                          <button
                            onClick={() => cancelThresholdEdit(item._id)}
                            disabled={row.thresholdSaving}
                            className="px-2 py-0.5 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {inv?.lowStockThreshold != null ? (
                          <span className="text-sm font-medium text-orange-700">
                            ≤ {inv.lowStockThreshold}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Off</span>
                        )}
                        <button
                          onClick={() => openThresholdEdit(item._id)}
                          className="text-xs text-orange-500 hover:text-orange-700 underline"
                          title="Set low-stock alert threshold"
                        >
                          {inv?.lowStockThreshold != null ? "Edit" : "Set"}
                        </button>
                        {inv?.lowStockThreshold != null && (
                          <button
                            onClick={async () => {
                              setRow(item._id, { thresholdSaving: true, thresholdError: "" });
                              try {
                                const updated = await updateInventoryThreshold(item._id, null);
                                setInventoryMap((prev) => ({ ...prev, [item._id]: updated }));
                              } catch (err: unknown) {
                                setRow(item._id, {
                                  thresholdError: err instanceof Error ? err.message : "Failed to clear",
                                });
                              } finally {
                                setRow(item._id, { thresholdSaving: false });
                              }
                            }}
                            className="text-xs text-gray-400 hover:text-red-500 underline"
                            title="Clear threshold (disable alert)"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Kiosk Visible toggle */}
                  <td className="px-5 py-3">
                    {(() => {
                      const enabled = inv ? inv.status : true;
                      return (
                        <button
                          onClick={() => toggle(item._id, !enabled)}
                          disabled={row.toggling}
                          title={enabled ? "Click to hide from kiosk" : "Click to show on kiosk"}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            enabled ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                              enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      );
                    })()}
                    {row.error && !row.editMode && (
                      <p className="text-xs text-red-500 mt-1">{row.error}</p>
                    )}
                  </td>

                  {/* Order Type dropdown */}
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <select
                        value={inv?.orderType ?? 'both'}
                        disabled={row.orderTypeUpdating}
                        onChange={(e) =>
                          changeOrderType(
                            item._id,
                            e.target.value as 'dineIn' | 'takeAway' | 'both'
                          )
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="both">🍽️🛍️ Both</option>
                        <option value="dineIn">🍽️ Dine In</option>
                        <option value="takeAway">🛍️ Take Away</option>
                      </select>
                      {row.orderTypeUpdating && (
                        <p className="text-xs text-blue-500">Saving…</p>
                      )}
                      {row.orderTypeError && (
                        <p className="text-xs text-red-500">{row.orderTypeError}</p>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        {row.error && (
                          <p className="text-xs text-red-500 mb-1">{row.error}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => save(item._id)}
                            disabled={row.saving}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {row.saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => cancelEdit(item._id)}
                            disabled={row.saving}
                            className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openEdit(item._id, "both")}
                          className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded hover:bg-blue-100"
                          title="Set both price and quantity"
                        >
                          Set Both
                        </button>
                        <button
                          onClick={() => openEdit(item._id, "price")}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded hover:bg-gray-100"
                          title="Update price only"
                        >
                          Price
                        </button>
                        <button
                          onClick={() => openEdit(item._id, "quantity")}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded hover:bg-gray-100"
                          title="Update quantity"
                        >
                          Qty
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
