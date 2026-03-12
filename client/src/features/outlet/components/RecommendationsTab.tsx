import { useEffect, useState } from "react";
import {
  fetchRecommendationSlots,
  createRecommendationSlot,
  updateRecommendationSlot,
  deleteRecommendationSlot,
  fetchMenuDetails,
  type RecommendationSlot,
  type MenuItem,
} from "../api";

// ── Time helpers (minutes-of-day ↔ HH:MM) ────────────────────────────────────

function minutesToTimeInput(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeInputToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatTimeRange(startMins: number, endMins: number): string {
  const toAMPM = (mins: number) => {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  };
  return `${toAMPM(startMins)} – ${toAMPM(endMins)}`;
}

// ── Form state type ───────────────────────────────────────────────────────────

type SlotForm = {
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  isActive: boolean;
  items: Array<{ itemId: string; priority: number }>;
};

const EMPTY_FORM: SlotForm = {
  name: "",
  startTime: "09:00",
  endTime: "21:00",
  isActive: true,
  items: [],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecommendationsTab() {
  const [slots, setSlots] = useState<RecommendationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Menu items used by the item picker inside the modal
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RecommendationSlot | null>(null);
  const [form, setForm] = useState<SlotForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Item picker row state (inside modal)
  const [pickerItemId, setPickerItemId] = useState("");
  const [pickerPriority, setPickerPriority] = useState(1);

  // Inline delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadSlots();
    loadMenuItems();
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRecommendationSlots();
      setSlots(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load recommendation slots");
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const data = await fetchMenuDetails();
      setMenuItems(data.items.filter((i) => i.status));
    } catch {
      // non-critical — item names will fall back to IDs
    }
  };

  // ── Modal open helpers ──────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingSlot(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setPickerItemId("");
    setPickerPriority(1);
    setModalOpen(true);
  };

  const openEdit = (slot: RecommendationSlot) => {
    setEditingSlot(slot);
    setForm({
      name: slot.name ?? "",
      startTime: minutesToTimeInput(slot.startTime),
      endTime: minutesToTimeInput(slot.endTime),
      isActive: slot.isActive,
      items: slot.items.map((i) => ({ itemId: i.itemId, priority: i.priority })),
    });
    setFormError("");
    setPickerItemId("");
    setPickerPriority(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSlot(null);
    setFormError("");
  };

  // ── Item picker helpers ─────────────────────────────────────────────────────

  const handleAddPickerItem = () => {
    if (!pickerItemId) return;
    if (form.items.length >= 10) {
      setFormError("A slot can have at most 10 recommended items");
      return;
    }
    if (form.items.some((i) => i.itemId === pickerItemId)) {
      setFormError("This item is already in the list");
      return;
    }
    if (pickerPriority < 1) {
      setFormError("Priority must be at least 1");
      return;
    }
    setFormError("");
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { itemId: pickerItemId, priority: pickerPriority }],
    }));
    setPickerItemId("");
    setPickerPriority(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.itemId !== itemId),
    }));
  };

  const handlePriorityChange = (itemId: string, val: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.itemId === itemId ? { ...i, priority: val } : i
      ),
    }));
  };

  // ── Save handler ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setFormError("");

    if (!form.startTime || !form.endTime) {
      setFormError("Start time and end time are required");
      return;
    }
    const startMins = timeInputToMinutes(form.startTime);
    const endMins = timeInputToMinutes(form.endTime);
    if (endMins <= startMins) {
      setFormError("End time must be after start time");
      return;
    }
    for (const item of form.items) {
      if (item.priority < 1) {
        setFormError("All priorities must be at least 1");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || undefined,
        startTime: startMins,
        endTime: endMins,
        isActive: form.isActive,
        items: form.items,
      };

      if (editingSlot) {
        const updated = await updateRecommendationSlot(editingSlot._id, payload);
        setSlots((prev) =>
          prev.map((s) => (s._id === updated._id ? updated : s))
        );
      } else {
        const created = await createRecommendationSlot(payload);
        setSlots((prev) => [...prev, created]);
      }
      closeModal();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save slot");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await deleteRecommendationSlot(id);
      setSlots((prev) => prev.filter((s) => s._id !== id));
      setDeletingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete slot");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Utilities ───────────────────────────────────────────────────────────────

  const getItemName = (itemId: string): string => {
    const item = menuItems.find((i) => i._id === itemId);
    if (!item) return itemId;
    return typeof item.name === "string"
      ? item.name
      : item.name.en || itemId;
  };

  // Options available for the picker (items not already added)
  const pickerOptions = menuItems.filter(
    (i) => !form.items.some((fi) => fi.itemId === i._id)
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Recommendations</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure time-based slots — items in an active slot are surfaced as
            recommendations on the kiosk.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Slot
        </button>
      </div>

      {/* Page-level error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Loading recommendation slots…</p>
        </div>
      ) : slots.length === 0 ? (
        /* Empty state */
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-gray-600 font-medium mb-1">No recommendation slots yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Create a time slot to surface hand-picked items at the top of the kiosk menu.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + New Slot
          </button>
        </div>
      ) : (
        /* Slots table */
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Time Window
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Items
                </th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {slots.map((slot) => (
                <tr key={slot._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800">
                    {slot.name || (
                      <span className="text-gray-400 italic font-normal">Unnamed</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {formatTimeRange(slot.startTime, slot.endTime)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {slot.items.length}{" "}
                    {slot.items.length === 1 ? "item" : "items"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                        slot.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {slot.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {deletingId === slot._id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button
                          onClick={() => handleDelete(slot._id)}
                          disabled={deleteLoading}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? "…" : "Yes"}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => openEdit(slot)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingId(slot._id)}
                          className="text-sm text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-800">
                {editingSlot ? "Edit Recommendation Slot" : "New Recommendation Slot"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Form-level error */}
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              {/* Slot name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Slot Name{" "}
                  <span className="normal-case font-normal text-gray-400">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch Specials"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Time window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-0.5">
                <div>
                  <p className="text-sm font-medium text-gray-700">Active</p>
                  <p className="text-xs text-gray-400">
                    Slot is served to kiosk devices when active
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, isActive: !f.isActive }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Recommended items */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Recommended Items{" "}
                  <span className="normal-case font-normal text-gray-400">
                    ({form.items.length}/10) — higher priority shown first
                  </span>
                </label>

                {/* Added items list */}
                {form.items.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                            Item
                          </th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-28">
                            Priority
                          </th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {form.items.map((fi) => (
                          <tr key={fi.itemId} className="bg-white">
                            <td className="px-3 py-2 text-gray-800 truncate max-w-[200px]">
                              {getItemName(fi.itemId)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                value={fi.priority}
                                onChange={(e) =>
                                  handlePriorityChange(
                                    fi.itemId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => handleRemoveItem(fi.itemId)}
                                className="text-red-400 hover:text-red-600 font-bold text-base leading-none"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add item row */}
                {form.items.length < 10 && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <select
                        value={pickerItemId}
                        onChange={(e) => setPickerItemId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select item…</option>
                        {pickerOptions.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name.en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        min={1}
                        value={pickerPriority}
                        onChange={(e) =>
                          setPickerPriority(parseInt(e.target.value) || 1)
                        }
                        placeholder="Pri."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPickerItem}
                      disabled={!pickerItemId}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="border-t border-gray-100 px-6 py-4 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : editingSlot ? "Save Changes" : "Create Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
