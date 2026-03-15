import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { localised } from "../../../common/utils/languages";
import TruncatedText from "../../../common/components/TruncatedText";
import {
  fetchOutletInventory,
  fetchMenuDetails,
  toggleInventoryStatus,
  updateInventorySchedule,
  type InventoryRecord,
  type MenuItem,
  type ScheduleSlotType,
  type PrioritySlot,
  type PriceSlot,
  type AvailabilitySlot,
} from "../api";
import ScheduleModal from "./ScheduleModal";
import ItemDetailsModal from "./ItemDetailsModal";
import ItemOptionsModal from "./ItemOptionsModal";

// ── types ─────────────────────────────────────────────────────────────────────

type RowState = {
  toggling: boolean;
  error: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function emptyRow(): RowState {
  return { toggling: false, error: "" };
}

// ── component ─────────────────────────────────────────────────────────────────

type Props = {
  socketRef: { current: Socket | null };
};

export default function InventoryTab({ socketRef }: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryRecord>>({});
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; itemId: string | null }>(
    { open: false, itemId: null }
  );
  const openSchedule = (itemId: string) => setScheduleModal({ open: true, itemId });
  const closeSchedule = () => setScheduleModal({ open: false, itemId: null });

  // Options modal (Low-Stock, Prep Time, Base Cost, Order Type, Quick Edit)
  const [optionsModal, setOptionsModal] = useState<{ open: boolean; itemId: string | null }>(
    { open: false, itemId: null }
  );
  const openOptions = (itemId: string) => setOptionsModal({ open: true, itemId });
  const closeOptions = () => setOptionsModal({ open: false, itemId: null });

  // Details modal (full item info)
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; itemId: string | null }>(
    { open: false, itemId: null }
  );
  const openDetails = (itemId: string) => setDetailsModal({ open: true, itemId });
  const closeDetails = () => setDetailsModal({ open: false, itemId: null });

  // Callback used by both modals to sync updates back into inventoryMap
  const handleInventoryUpdate = (updated: InventoryRecord) => {
    setInventoryMap((prev) => ({ ...prev, [updated.itemId as string]: updated }));
  };

  const handleSaveSchedule = async (
    itemId: string,
    type: ScheduleSlotType,
    slots: PrioritySlot[] | PriceSlot[] | AvailabilitySlot[]
  ) => {
    const updated = await updateInventorySchedule(itemId, type, slots);
    setInventoryMap((prev) => ({ ...prev, [itemId]: updated }));
  };

  useEffect(() => {
    load();
  }, []);

  // Keep inventoryMap in sync with real-time socket updates so row colors
  // (out-of-stock red, low-stock yellow) update without a manual refresh.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handler = (payload: {
      itemId: string;
      price: number | null;
      quantity: number;
      status: boolean;
      orderType: "dineIn" | "takeAway" | "both";
    }) => {
      setInventoryMap((prev) => {
        const existing = prev[payload.itemId];
        if (!existing) return prev;
        return {
          ...prev,
          [payload.itemId]: {
            ...existing,
            quantity: payload.quantity,
            ...(payload.price != null && { price: payload.price }),
            status: payload.status,
            orderType: payload.orderType,
          },
        };
      });
    };

    socket.on("inventory:update", handler);
    return () => { socket.off("inventory:update", handler); };
  }, [socketRef]);

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

  const itemNameMap = Object.fromEntries(
    items.map((menuItem) => [menuItem._id, localised(menuItem.name, "en")])
  );

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
              <th className="text-left px-5 py-3 font-medium text-gray-600">Kiosk Visible</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const inv = inventoryMap[item._id];
              const row = getRow(item._id);
              const isCombo = item.type === "combo";
              const comboQty =
                isCombo && item.comboItems && item.comboItems.length > 0
                  ? item.comboItems.reduce((min, ci) => {
                      const rec = inventoryMap[ci.item];
                      const available = rec ? Math.floor(rec.quantity / ci.quantity) : 0;
                      return Math.min(min, available);
                    }, Infinity)
                  : null;
              const derivedQty = isCombo
                ? isFinite(comboQty as number)
                  ? (comboQty as number)
                  : 0
                : null;
              const isZero = isCombo
                ? derivedQty === 0
                : inv != null && inv.quantity === 0;
              const isLow =
                !isCombo &&
                inv != null &&
                inv.lowStockThreshold != null &&
                inv.quantity > 0 &&
                inv.quantity <= inv.lowStockThreshold;
              const rowBg = isZero
                ? "bg-red-50 hover:bg-red-100"
                : isLow
                ? "bg-yellow-50 hover:bg-yellow-100"
                : "hover:bg-gray-50";

              return (
                <tr key={item._id} className={`transition-colors ${rowBg}`}>
                  {/* Item */}
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-gray-800">
                            <TruncatedText text={localised(item.name, "en")} maxLength={30} />
                          </p>
                          {isCombo && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                              Combo
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-[14rem]">
                            <TruncatedText text={localised(item.description, "en")} maxLength={48} />
                          </p>
                        )}
                      </div>
                      {/* Info button — opens full details modal */}
                      <button
                        onClick={() => openDetails(item._id)}
                        className="flex-shrink-0 mt-0.5 p-0.5 text-gray-300 hover:text-blue-500 transition-colors rounded"
                        title="View item details"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="w-3.5 h-3.5"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
                          <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round" strokeWidth={2.5} />
                        </svg>
                      </button>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.status
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {item.status ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Default Price */}
                  <td className="px-5 py-3 text-gray-500">₹{item.defaultAmount}</td>

                  {/* Outlet Price */}
                  <td className="px-5 py-3">
                    {inv && inv.price != null ? (
                      <span className="font-semibold text-gray-800">₹{inv.price}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        ₹{item.defaultAmount}
                        <span className="ml-1 italic">(default)</span>
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-5 py-3">
                    {isCombo ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            derivedQty === 0 ? "text-red-500" : "text-gray-800"
                          }`}
                        >
                          {derivedQty}
                        </span>
                        <span className="text-xs text-blue-500 italic">auto</span>
                      </div>
                    ) : inv ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            inv.quantity === 0 ? "text-red-500" : "text-gray-800"
                          }`}
                        >
                          {inv.quantity}
                        </span>
                        {inv.lowStockThreshold != null &&
                          inv.quantity > 0 &&
                          inv.quantity <= inv.lowStockThreshold && (
                            <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                              Low
                            </span>
                          )}
                      </div>
                    ) : (
                      <span className="text-red-400 text-xs font-medium">0 (not set)</span>
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
                          title={
                            enabled ? "Click to hide from kiosk" : "Click to show on kiosk"
                          }
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
                    {row.error && (
                      <p className="text-xs text-red-500 mt-1">{row.error}</p>
                    )}
                  </td>

                  {/* Options button */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openOptions(item._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Edit options for this item"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-3.5 h-3.5"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Options
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Item Details Modal */}
      {detailsModal.open &&
        detailsModal.itemId &&
        (() => {
          const modalItem = items.find((it) => it._id === detailsModal.itemId);
          if (!modalItem) return null;
          const modalIsCombo = modalItem.type === "combo";
          const modalComboQty =
            modalIsCombo && modalItem.comboItems && modalItem.comboItems.length > 0
              ? modalItem.comboItems.reduce((min, ci) => {
                  const rec = inventoryMap[ci.item];
                  const available = rec ? Math.floor(rec.quantity / ci.quantity) : 0;
                  return Math.min(min, available);
                }, Infinity)
              : null;
          const modalDerivedQty = modalIsCombo
            ? isFinite(modalComboQty as number)
              ? (modalComboQty as number)
              : 0
            : null;
          return (
            <ItemDetailsModal
              item={modalItem}
              inv={inventoryMap[detailsModal.itemId]}
              derivedQty={modalDerivedQty}
              itemNameMap={itemNameMap}
              onClose={closeDetails}
            />
          );
        })()}

      {/* Item Options Modal */}
      {optionsModal.open &&
        optionsModal.itemId &&
        (() => {
          const modalItem = items.find((it) => it._id === optionsModal.itemId);
          if (!modalItem) return null;
          return (
            <ItemOptionsModal
              item={modalItem}
              inv={inventoryMap[optionsModal.itemId]}
              isCombo={modalItem.type === "combo"}
              onUpdate={handleInventoryUpdate}
              onClose={closeOptions}
              onOpenSchedule={openSchedule}
            />
          );
        })()}

      {/* Schedule Modal */}
      {scheduleModal.open &&
        scheduleModal.itemId &&
        (() => {
          const modalItem = items.find((it) => it._id === scheduleModal.itemId);
          const modalInv = inventoryMap[scheduleModal.itemId];
          if (!modalItem) return null;
          return (
            <ScheduleModal
              itemId={scheduleModal.itemId}
              itemName={localised(modalItem.name, "en")}
              inventory={
                modalInv ?? {
                  _id: "",
                  itemId: scheduleModal.itemId,
                  outletId: "",
                  price: 0,
                  quantity: 0,
                  status: true,
                  orderType: "both",
                  lowStockThreshold: null,
                  prepTime: 3,
                  baseCost: null,
                  prioritySlots: [],
                  priceSlots: [],
                  availabilitySlots: [],
                  editedBy: "",
                }
              }
              defaultPrice={modalItem.defaultAmount}
              onClose={closeSchedule}
              onSave={handleSaveSchedule}
            />
          );
        })()}
    </div>
  );
}
