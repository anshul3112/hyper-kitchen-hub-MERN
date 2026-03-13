import { useState } from "react";
import { localised } from "../../../common/utils/languages";
import {
  updateInventoryOrderType,
  updateInventoryThreshold,
  updateInventoryPrepTime,
  updateInventoryBaseCost,
  upsertInventoryItem,
  updateInventoryPrice,
  updateInventoryQuantity,
  type InventoryRecord,
  type MenuItem,
} from "../api";

// ── tiny shared SVG icons ──────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

type Props = {
  item: MenuItem;
  inv: InventoryRecord | undefined;
  isCombo: boolean;
  onUpdate: (updated: InventoryRecord) => void;
  onClose: () => void;
  onOpenSchedule: (itemId: string) => void;
};

export default function ItemOptionsModal({
  item,
  inv,
  isCombo,
  onUpdate,
  onClose,
  onOpenSchedule,
}: Props) {
  const itemId = item._id;

  // ── Quick Edit (price / qty) ──────────────────────────────────────────────
  const [editSection, setEditSection] = useState<"price" | "qty" | "both" | null>(null);
  const [priceInput, setPriceInput] = useState(
    inv?.price != null ? String(inv.price) : String(item.defaultAmount)
  );
  const [qtyInput, setQtyInput] = useState(
    inv?.quantity != null ? String(inv.quantity) : "0"
  );
  const [pqSaving, setPqSaving] = useState(false);
  const [pqError, setPqError] = useState("");

  const openQuickEdit = (mode: "price" | "qty" | "both") => {
    // Re-sync inputs from latest inv each time user opens
    setPriceInput(inv?.price != null ? String(inv.price) : String(item.defaultAmount));
    setQtyInput(inv?.quantity != null ? String(inv.quantity) : "0");
    setPqError("");
    setEditSection(mode);
  };

  const savePriceQty = async () => {
    setPqError("");
    const price = parseFloat(priceInput);
    const qty = parseInt(qtyInput, 10);
    if (
      (editSection === "price" || editSection === "both") &&
      (isNaN(price) || price < 0)
    ) {
      setPqError("Price must be ≥ 0");
      return;
    }
    if (
      (editSection === "qty" || editSection === "both") &&
      (isNaN(qty) || qty < 0)
    ) {
      setPqError("Quantity must be a non-negative whole number");
      return;
    }
    setPqSaving(true);
    try {
      let updated: InventoryRecord;
      if (editSection === "both") {
        updated = await upsertInventoryItem(itemId, price, qty);
      } else if (editSection === "price") {
        updated = await updateInventoryPrice(itemId, price);
      } else {
        updated = await updateInventoryQuantity(itemId, qty);
      }
      onUpdate(updated);
      setEditSection(null);
    } catch (e: unknown) {
      setPqError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setPqSaving(false);
    }
  };

  // ── Order Type ────────────────────────────────────────────────────────────
  const [orderType, setOrderType] = useState<"dineIn" | "takeAway" | "both">(
    inv?.orderType ?? "both"
  );
  const [otSaving, setOtSaving] = useState(false);
  const [otError, setOtError] = useState("");

  const saveOrderType = async (newType: "dineIn" | "takeAway" | "both") => {
    if (otSaving) return;
    setOtSaving(true);
    setOtError("");
    try {
      const updated = await updateInventoryOrderType(itemId, newType);
      setOrderType(newType);
      onUpdate(updated);
    } catch (e: unknown) {
      setOtError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setOtSaving(false);
    }
  };

  // ── Low-Stock Alert ───────────────────────────────────────────────────────
  const currentThreshold = inv?.lowStockThreshold ?? null;
  const [thresholdEditing, setThresholdEditing] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(
    currentThreshold != null ? String(currentThreshold) : ""
  );
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [thresholdError, setThresholdError] = useState("");

  const saveThreshold = async () => {
    const raw = thresholdInput.trim();
    const value = raw === "" ? null : parseInt(raw, 10);
    if (value !== null && (isNaN(value) || value < 0)) {
      setThresholdError("Must be a non-negative whole number, or blank to disable");
      return;
    }
    setThresholdSaving(true);
    setThresholdError("");
    try {
      const updated = await updateInventoryThreshold(itemId, value);
      onUpdate(updated);
      setThresholdEditing(false);
    } catch (e: unknown) {
      setThresholdError(e instanceof Error ? e.message : "Failed");
    } finally {
      setThresholdSaving(false);
    }
  };

  const clearThreshold = async () => {
    setThresholdSaving(true);
    setThresholdError("");
    try {
      const updated = await updateInventoryThreshold(itemId, null);
      setThresholdInput("");
      onUpdate(updated);
    } catch (e: unknown) {
      setThresholdError(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setThresholdSaving(false);
    }
  };

  // ── Prep Time ─────────────────────────────────────────────────────────────
  const currentPrepTime = inv?.prepTime ?? 3;
  const [prepEditing, setPrepEditing] = useState(false);
  const [prepInput, setPrepInput] = useState(String(currentPrepTime));
  const [prepSaving, setPrepSaving] = useState(false);
  const [prepError, setPrepError] = useState("");

  const savePrepTime = async () => {
    const value = parseInt(prepInput.trim(), 10);
    if (isNaN(value) || value < 0) {
      setPrepError("Must be 0 or more (0 = instant)");
      return;
    }
    setPrepSaving(true);
    setPrepError("");
    try {
      const updated = await updateInventoryPrepTime(itemId, value);
      onUpdate(updated);
      setPrepEditing(false);
    } catch (e: unknown) {
      setPrepError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPrepSaving(false);
    }
  };

  // ── Base Cost ─────────────────────────────────────────────────────────────
  const currentBaseCost = inv?.baseCost ?? null;
  const [costEditing, setCostEditing] = useState(false);
  const [costInput, setCostInput] = useState(
    currentBaseCost != null ? String(currentBaseCost) : ""
  );
  const [costSaving, setCostSaving] = useState(false);
  const [costError, setCostError] = useState("");

  const saveBaseCost = async () => {
    const raw = costInput.trim();
    const value = raw === "" ? null : parseFloat(raw);
    if (value !== null && (isNaN(value) || value < 0)) {
      setCostError("Must be ≥ 0, or blank to disable");
      return;
    }
    setCostSaving(true);
    setCostError("");
    try {
      const updated = await updateInventoryBaseCost(itemId, value);
      onUpdate(updated);
      setCostEditing(false);
    } catch (e: unknown) {
      setCostError(e instanceof Error ? e.message : "Failed");
    } finally {
      setCostSaving(false);
    }
  };

  const clearBaseCost = async () => {
    setCostSaving(true);
    setCostError("");
    try {
      const updated = await updateInventoryBaseCost(itemId, null);
      setCostInput("");
      onUpdate(updated);
    } catch (e: unknown) {
      setCostError(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setCostSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">
              {localised(item.name, "en")}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Item Options</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* ── Quick Edit ─────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Quick Edit
            </p>
            {editSection === null ? (
              <div className="flex flex-wrap gap-2">
                {!isCombo && (
                  <button
                    onClick={() => openQuickEdit("both")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Set Both
                  </button>
                )}
                <button
                  onClick={() => openQuickEdit("price")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Edit Price
                </button>
                {!isCombo && (
                  <button
                    onClick={() => openQuickEdit("qty")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Edit Qty
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                {(editSection === "price" || editSection === "both") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Outlet Price (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full px-3 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      autoFocus
                    />
                  </div>
                )}
                {(editSection === "qty" || editSection === "both") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={qtyInput}
                      onChange={(e) => setQtyInput(e.target.value)}
                      className="w-full px-3 py-2.5 border border-blue-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                  </div>
                )}
                {pqError && (
                  <p className="text-xs text-red-500">{pqError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={savePriceQty}
                    disabled={pqSaving}
                    className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {pqSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditSection(null)}
                    disabled={pqSaving}
                    className="px-5 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Order Type ─────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Order Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "both", label: "Both" },
                  { value: "dineIn", label: "Dine In" },
                  { value: "takeAway", label: "Take Away"},
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => saveOrderType(opt.value)}
                  disabled={otSaving}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all disabled:opacity-50 ${
                    orderType === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {otError && (
              <p className="text-xs text-red-500 mt-2">{otError}</p>
            )}
          </section>

          {/* ── Low-Stock Alert ────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Low-Stock Alert
              </p>
              {isCombo && (
                <span className="text-xs text-gray-400 italic">N/A for combos</span>
              )}
            </div>
            {!isCombo && (
              <>
                {thresholdEditing ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
                    <label className="block text-xs font-medium text-gray-600">
                      Alert when quantity drops to or below:
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g. 5"
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(e.target.value)}
                      className="w-full px-3 py-2.5 border border-orange-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400">
                      Leave blank to disable the alert.
                    </p>
                    {thresholdError && (
                      <p className="text-xs text-red-500">{thresholdError}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveThreshold}
                        disabled={thresholdSaving}
                        className="flex-1 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {thresholdSaving ? "Saving…" : "Set Alert"}
                      </button>
                      <button
                        onClick={() => setThresholdEditing(false)}
                        disabled={thresholdSaving}
                        className="px-5 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          currentThreshold != null
                            ? "bg-orange-400"
                            : "bg-gray-300"
                        }`}
                      />
                      <span className="text-sm text-gray-700">
                        {currentThreshold != null
                          ? `Alert at ≤ ${currentThreshold} units`
                          : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setThresholdInput(
                            currentThreshold != null
                              ? String(currentThreshold)
                              : ""
                          );
                          setThresholdEditing(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <PencilIcon />
                        {currentThreshold != null ? "Edit" : "Set"}
                      </button>
                      {currentThreshold != null && (
                        <button
                          onClick={clearThreshold}
                          disabled={thresholdSaving}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                          title="Disable alert"
                        >
                          <TrashIcon />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Prep Time ──────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Prep Time
            </p>
            {prepEditing ? (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-medium text-gray-600">
                  Minutes to prepare
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={prepInput}
                    onChange={(e) => setPrepInput(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-purple-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    autoFocus
                  />
                  <span className="text-sm text-gray-500 flex-shrink-0">min</span>
                </div>
                <p className="text-xs text-gray-400">Use 0 for instant / pre-packaged items.</p>
                {prepError && (
                  <p className="text-xs text-red-500">{prepError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={savePrepTime}
                    disabled={prepSaving}
                    className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {prepSaving ? "Saving…" : "Update"}
                  </button>
                  <button
                    onClick={() => setPrepEditing(false)}
                    disabled={prepSaving}
                    className="px-5 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-4 h-4 text-purple-400 flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span
                    className={`text-sm font-semibold ${
                      currentPrepTime === 0 ? "text-blue-600" : "text-gray-800"
                    }`}
                  >
                    {currentPrepTime === 0 ? "Instant" : `${currentPrepTime} min`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPrepInput(String(currentPrepTime));
                    setPrepEditing(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <PencilIcon />
                  Edit
                </button>
              </div>
            )}
          </section>

          {/* ── Base Cost ──────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Base Cost{" "}
              <span className="normal-case font-normal text-gray-400">(for margin scoring)</span>
            </p>
            {costEditing ? (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-medium text-gray-600">
                  Cost basis (₹)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 flex-shrink-0">₹</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 80"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-teal-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Leave blank to disable margin-weighted recommendations.
                </p>
                {costError && (
                  <p className="text-xs text-red-500">{costError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveBaseCost}
                    disabled={costSaving}
                    className="flex-1 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {costSaving ? "Saving…" : "Update"}
                  </button>
                  <button
                    onClick={() => setCostEditing(false)}
                    disabled={costSaving}
                    className="px-5 py-2.5 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-4 h-4 text-teal-400 flex-shrink-0"
                  >
                    <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span
                    className={`text-sm font-semibold ${
                      currentBaseCost != null
                        ? "text-teal-700"
                        : "text-gray-400"
                    }`}
                  >
                    {currentBaseCost != null ? `₹${currentBaseCost}` : "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCostInput(
                        currentBaseCost != null ? String(currentBaseCost) : ""
                      );
                      setCostEditing(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <PencilIcon />
                    {currentBaseCost != null ? "Edit" : "Set"}
                  </button>
                  {currentBaseCost != null && (
                    <button
                      onClick={clearBaseCost}
                      disabled={costSaving}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      title="Remove base cost"
                    >
                      <TrashIcon />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Schedule ───────────────────────────────────────── */}
          <section className="pb-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Schedule
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenSchedule(itemId);
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-700 hover:bg-indigo-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-4 h-4"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                    <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Manage Schedule Slots</p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    Priority, price windows & availability
                  </p>
                </div>
              </div>
              <ChevronRightIcon />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
