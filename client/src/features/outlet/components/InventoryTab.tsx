import { useEffect, useState } from "react";
import {
  fetchOutletInventory,
  fetchMenuDetails,
  upsertInventoryItem,
  updateInventoryPrice,
  updateInventoryQuantity,
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
  error: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function emptyRow(): RowState {
  return { editMode: null, priceInput: "", quantityInput: "", saving: false, error: "" };
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
                    ) : inv ? (
                      <span className="font-semibold text-gray-800">₹{inv.price}</span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Not set</span>
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
                      <span className={`font-semibold ${inv.quantity === 0 ? "text-red-500" : "text-gray-800"}`}>
                        {inv.quantity}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-xs">Not set</span>
                    )}
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
                          disabled={!inv}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={!inv ? "Set a price first before updating quantity" : "Update quantity only"}
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
