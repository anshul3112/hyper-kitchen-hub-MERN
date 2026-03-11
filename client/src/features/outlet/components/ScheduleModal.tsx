import { useRef, useState } from "react";
import type {
  InventoryRecord,
  ScheduleSlotType,
  PrioritySlot,
  PriceSlot,
  AvailabilitySlot,
} from "../api";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Convert "HH:MM" → minutes-of-day (0–1440) */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Convert minutes-of-day (0–1440) → "HH:MM" */
function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ISO date string → "YYYY-MM-DD" (for <input type="date">) */
function toDateInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // already "YYYY-MM-DD"
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

// ── sub-components ─────────────────────────────────────────────────────────────

function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (d: number) =>
    onChange(
      value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b)
    );
  return (
    <div className="flex gap-1 flex-wrap items-center">
      {DAY_LABELS.map((label, d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={`w-8 h-8 rounded-full text-xs font-semibold border transition-colors ${
            value.includes(d)
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
          }`}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])}
        className="ml-1 text-[10px] text-blue-600 hover:underline whitespace-nowrap"
      >
        All Days
      </button>
    </div>
  );
}

function TimeRow({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  onFullDay,
  label,
}: {
  startTime: number;
  endTime: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  onFullDay?: (start: number, end: number) => void;
  label?: string;
}) {
  const handleFullDay = () => {
    if (onFullDay) {
      onFullDay(0, 1439);
    } else {
      onStartChange(0);
      onEndChange(1439);
    }
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">From</span>
        <input
          type="time"
          value={toHHMM(startTime)}
          onChange={(e) => onStartChange(toMinutes(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-500">to</span>
        <input
          type="time"
          value={toHHMM(endTime)}
          onChange={(e) => onEndChange(toMinutes(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleFullDay}
          className="ml-1 text-[10px] text-blue-600 hover:underline whitespace-nowrap"
        >
          Full Day
        </button>
      </div>
    </div>
  );
}

// ── slot list items ────────────────────────────────────────────────────────────

function SlotRow({
  label,
  detail,
  onEdit,
  onDelete,
}: {
  label: string;
  detail: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{detail}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-blue-600 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-500 hover:underline"
        >
          Del
        </button>
      </div>
    </div>
  );
}

// ── blank slot factories ───────────────────────────────────────────────────────

const now6am = 360; // 06:00
const now10pm = 1320; // 22:00

const blankPriority = (): PrioritySlot => ({
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startTime: now6am,
  endTime: now10pm,
  price: 0,
});

const blankPrice = (): PriceSlot => ({
  days: [1, 2, 3, 4, 5],
  startTime: now6am,
  endTime: now10pm,
  price: 0,
});

const blankAvailability = (): AvailabilitySlot => ({
  days: [1, 2, 3, 4, 5],
  startTime: now6am,
  endTime: now10pm,
});

// ── main component ─────────────────────────────────────────────────────────────

type Props = {
  itemId: string;
  itemName: string;
  inventory: InventoryRecord;
  defaultPrice: number;
  onClose: () => void;
  onSave: (
    itemId: string,
    type: ScheduleSlotType,
    slots: PrioritySlot[] | PriceSlot[] | AvailabilitySlot[]
  ) => Promise<void>;
};

export default function ScheduleModal({
  itemId,
  itemName,
  inventory,
  defaultPrice,
  onClose,
  onSave,
}: Props) {
  const [activeTab, setActiveTab] = useState<ScheduleSlotType>("prioritySlots");

  // Local copies of all 3 slot arrays (initialised from inventory prop)
  const [localPriority, setLocalPriority] = useState<PrioritySlot[]>(
    () => (inventory.prioritySlots ?? []).map((s) => ({ ...s }))
  );
  const [localPrice, setLocalPrice] = useState<PriceSlot[]>(
    () => (inventory.priceSlots ?? []).map((s) => ({ ...s }))
  );
  const [localAvail, setLocalAvail] = useState<AvailabilitySlot[]>(
    () => (inventory.availabilitySlots ?? []).map((s) => ({ ...s }))
  );

  // Snapshot of initial state for dirty-tracking
  const initialRef = useRef({
    priority: JSON.stringify(inventory.prioritySlots ?? []),
    price: JSON.stringify(inventory.priceSlots ?? []),
    avail: JSON.stringify(inventory.availabilitySlots ?? []),
  });

  const isDirty =
    JSON.stringify(localPriority) !== initialRef.current.priority ||
    JSON.stringify(localPrice) !== initialRef.current.price ||
    JSON.stringify(localAvail) !== initialRef.current.avail;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [unsavedWarning, setUnsavedWarning] = useState(false);

  // Per-tab inline editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Draft for the slot currently being edited/added
  const [draft, setDraft] = useState<PrioritySlot | PriceSlot | AvailabilitySlot | null>(null);
  const [draftError, setDraftError] = useState("");
  // Raw string for the price input so the field starts empty (placeholder "0") instead of showing a literal 0 that blocks typing
  const [rawPrice, setRawPrice] = useState("");

  // Reset editing state whenever the tab changes
  const switchTab = (tab: ScheduleSlotType) => {
    setActiveTab(tab);
    setEditingIndex(null);
    setAddingNew(false);
    setDraft(null);
    setSaveError("");
    setSuccessMsg("");
    setDraftError("");
    setRawPrice("");
    setUnsavedWarning(false);
  };

  // Helpers to get/set the active slot array
  const getSlots = (): (PrioritySlot | PriceSlot | AvailabilitySlot)[] => {
    if (activeTab === "prioritySlots") return localPriority;
    if (activeTab === "priceSlots") return localPrice;
    return localAvail;
  };

  const setSlots = (updated: PrioritySlot[] | PriceSlot[] | AvailabilitySlot[]) => {
    if (activeTab === "prioritySlots") setLocalPriority(updated as PrioritySlot[]);
    else if (activeTab === "priceSlots") setLocalPrice(updated as PriceSlot[]);
    else setLocalAvail(updated as AvailabilitySlot[]);
  };

  const blankForTab = (): PrioritySlot | PriceSlot | AvailabilitySlot => {
    if (activeTab === "prioritySlots") return blankPriority();
    if (activeTab === "priceSlots") return blankPrice();
    return blankAvailability();
  };

  const openAdd = () => {
    if (getSlots().length >= 10) return;
    setAddingNew(true);
    setEditingIndex(null);
    setDraft(blankForTab());
    setRawPrice("");
    setDraftError("");
  };

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setAddingNew(false);
    const slot = getSlots()[index];
    setDraft({ ...slot } as PrioritySlot | PriceSlot | AvailabilitySlot);
    const existingPrice = (slot as PriceSlot).price;
    setRawPrice(existingPrice !== undefined && existingPrice !== 0 ? String(existingPrice) : "");
    setDraftError("");
  };

  const cancelDraft = () => {
    setEditingIndex(null);
    setAddingNew(false);
    setDraft(null);
    setRawPrice("");
    setDraftError("");
  };

  const commitDraft = () => {
    if (!draft) return;
    const d = draft as { startTime: number; endTime: number };
    if (d.endTime <= d.startTime) {
      setDraftError("End time must be after start time");
      return;
    }
    setDraftError("");
    const updated = [...getSlots()];
    if (addingNew) {
      updated.push(draft as never);
    } else if (editingIndex !== null) {
      updated[editingIndex] = draft as never;
    }
    setSlots(updated as PrioritySlot[] | PriceSlot[] | AvailabilitySlot[]);
    cancelDraft();
  };

  const deleteSlot = (index: number) => {
    const updated = getSlots().filter((_, i) => i !== index);
    setSlots(updated as PrioritySlot[] | PriceSlot[] | AvailabilitySlot[]);
    if (editingIndex === index) cancelDraft();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSuccessMsg("");
    setUnsavedWarning(false);
    try {
      await Promise.all([
        onSave(itemId, "prioritySlots", localPriority),
        onSave(itemId, "priceSlots", localPrice),
        onSave(itemId, "availabilitySlots", localAvail),
      ]);
      // Update initial snapshot so isDirty resets to false
      initialRef.current = {
        priority: JSON.stringify(localPriority),
        price: JSON.stringify(localPrice),
        avail: JSON.stringify(localAvail),
      };
      setSuccessMsg("Schedule changes saved successfully.");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  // ── slot label helpers ────────────────────────────────────────────────────

  const slotLabel = (slot: PrioritySlot | PriceSlot | AvailabilitySlot) => {
    const start = toHHMM((slot as PriceSlot).startTime);
    const end = toHHMM((slot as PriceSlot).endTime);

    if (activeTab === "prioritySlots") {
      const s = slot as PrioritySlot;
      return {
        label: `${toDateInput(s.startDate)} → ${toDateInput(s.endDate)}  •  ${start}–${end}`,
        detail: `₹${s.price}`,
      };
    }
    if (activeTab === "priceSlots") {
      const s = slot as PriceSlot;
      const dayStr = (s.days ?? []).map((d) => DAY_LABELS[d]).join(" ");
      return { label: `[${dayStr}]  ${start}–${end}`, detail: `₹${s.price}` };
    }
    // availabilitySlots
    const s = slot as AvailabilitySlot;
    const dayStr = (s.days ?? []).map((d) => DAY_LABELS[d]).join(" ");
    return { label: `[${dayStr}]  ${start}–${end}`, detail: "Available during this window" };
  };

  // ── draft editor ───────────────────────────────────────────────────────────

  const renderDraftEditor = () => {
    if (!draft) return null;

    const commonTimeRows = (
      <TimeRow
        startTime={(draft as PriceSlot).startTime}
        endTime={(draft as PriceSlot).endTime}
        onStartChange={(v) => setDraft({ ...draft, startTime: v } as never)}
        onEndChange={(v) => setDraft({ ...draft, endTime: v } as never)}
        onFullDay={(s, e) => setDraft({ ...draft, startTime: s, endTime: e } as never)}
      />
    );

    let fields: React.ReactNode;

    if (activeTab === "prioritySlots") {
      const d = draft as PrioritySlot;
      fields = (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-600 w-20 shrink-0">Start date</label>
            <input
              type="date"
              value={toDateInput(d.startDate)}
              onChange={(e) => setDraft({ ...d, startDate: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-600 w-20 shrink-0">End date</label>
            <input
              type="date"
              value={toDateInput(d.endDate)}
              onChange={(e) => setDraft({ ...d, endDate: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {commonTimeRows}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 w-20 shrink-0">Price (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rawPrice}
              placeholder="0"
              onChange={(e) => {
                setRawPrice(e.target.value);
                setDraft({ ...d, price: parseFloat(e.target.value) || 0 });
              }}
              className="w-28 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    } else if (activeTab === "priceSlots") {
      const d = draft as PriceSlot;
      fields = (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs text-gray-600 mb-1">Days</p>
            <DayPicker value={d.days} onChange={(days) => setDraft({ ...d, days })} />
          </div>
          {commonTimeRows}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 w-20 shrink-0">Price (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={rawPrice}
              placeholder="0"
              onChange={(e) => {
                setRawPrice(e.target.value);
                setDraft({ ...d, price: parseFloat(e.target.value) || 0 });
              }}
              className="w-28 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      );
    } else {
      const d = draft as AvailabilitySlot;
      fields = (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs text-gray-600 mb-1">Days</p>
            <DayPicker value={d.days} onChange={(days) => setDraft({ ...d, days })} />
          </div>
          {commonTimeRows}
        </div>
      );
    }

    return (
      <div className="mt-3 border border-blue-200 rounded-lg p-3 bg-blue-50">
        <p className="text-xs font-semibold text-blue-700 mb-2">
          {addingNew ? "New slot" : `Edit slot #${(editingIndex ?? 0) + 1}`}
        </p>
        {fields}
        {draftError && (
          <p className="text-xs text-red-500 mt-1">{draftError}</p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={commitDraft}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            {addingNew ? "Add" : "Update"}
          </button>
          <button
            type="button"
            onClick={cancelDraft}
            className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ── tab meta ───────────────────────────────────────────────────────────────

  const tabs: { key: ScheduleSlotType; label: string; desc: string; color: string }[] = [
    {
      key: "prioritySlots",
      label: "Priority",
      desc: "Date-range overrides with highest priority. Active slot forces item visible and sets price.",
      color: "text-amber-700 bg-amber-50 border-amber-300",
    },
    {
      key: "priceSlots",
      label: "Price",
      desc: "Price changes on specific weekdays during a time window. Use All Days for every day.",
      color: "text-blue-700 bg-blue-50 border-blue-300",
    },
    {
      key: "availabilitySlots",
      label: "Availability",
      desc: "Define when this item is available. Days with no slot fall back to the admin toggle.",
      color: "text-green-700 bg-green-50 border-green-300",
    },
  ];

  const tabCounts: Record<ScheduleSlotType, number> = {
    prioritySlots: localPriority.length,
    priceSlots: localPrice.length,
    availabilitySlots: localAvail.length,
  };

  const currentTab = tabs.find((t) => t.key === activeTab)!;
  const slots = getSlots();

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Schedule — {itemName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Default price: ₹{defaultPrice}
              {inventory.price != null && (
                <span className="ml-2">• Outlet price: ₹{inventory.price}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-4 pt-3 overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={`px-3 py-1.5 text-xs rounded-t-md border-b-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
              <span className="ml-1 text-[10px] font-normal text-gray-400">
                ({tabCounts[t.key]})
              </span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Tab description */}
          <div className={`text-xs px-3 py-2 rounded-md border mb-3 ${currentTab.color}`}>
            {currentTab.desc}
            {activeTab === "prioritySlots" && (
              <p className="mt-1 font-medium">
                Priority slots override all other price and availability rules.
              </p>
            )}
          </div>

          {/* Slot list */}
          {slots.length === 0 ? (
            <p className="text-xs text-gray-400 italic mb-3">No slots configured.</p>
          ) : (
            <div className="flex flex-col gap-1.5 mb-3">
              {slots.map((slot, i) => {
                const { label, detail } = slotLabel(slot);
                return (
                  <SlotRow
                    key={i}
                    label={label}
                    detail={detail}
                    onEdit={() => openEdit(i)}
                    onDelete={() => deleteSlot(i)}
                  />
                );
              })}
            </div>
          )}

          {/* Editor */}
          {renderDraftEditor()}

          {/* Add button */}
          {!addingNew && editingIndex === null && (
            <button
              type="button"
              onClick={openAdd}
              disabled={slots.length >= 10}
              className="mt-2 text-xs text-blue-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {slots.length >= 10 ? "Max 10 slots reached" : "+ Add slot"}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-1.5 px-5 py-3 border-t border-gray-200 shrink-0">
          {/* Feedback messages */}
          {unsavedWarning && (
            <div className="flex items-center justify-between gap-3 rounded-md bg-amber-50 border border-amber-300 px-3 py-2">
              <p className="text-xs text-amber-700">You have unsaved changes.</p>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-red-600 hover:underline whitespace-nowrap"
              >
                Discard &amp; Close
              </button>
            </div>
          )}
          {successMsg && (
            <p className="text-xs text-green-600 font-medium">{successMsg}</p>
          )}
          {saveError && (
            <p className="text-xs text-red-500">{saveError}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {isDirty ? (
                <span className="text-amber-500 font-medium">Unsaved changes</span>
              ) : (
                "No pending changes"
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
