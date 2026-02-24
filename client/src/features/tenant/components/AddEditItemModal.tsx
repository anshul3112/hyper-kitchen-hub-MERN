import { useState } from "react";
import {
  createItem,
  updateItem,
  type MenuItem,
  type MenuCategory,
  type MenuFilter,
  type CreateItemInput,
} from "../api";

interface Props {
  item?: MenuItem | null; // null = create, MenuItem = edit
  categories: MenuCategory[];
  filters: MenuFilter[];
  onClose: () => void;
  onSuccess: (saved: MenuItem) => void;
}

export default function AddEditItemModal({
  item,
  categories,
  filters,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = Boolean(item);

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [defaultAmount, setDefaultAmount] = useState<string>(
    item?.defaultAmount !== undefined ? String(item.defaultAmount) : "",
  );
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");

  // Single required category
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    item?.category?._id ?? "",
  );
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>(
    () => (item?.filters ?? []).map((f) => f._id),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleCategory = (id: string) =>
    setSelectedCategoryId((prev) => (prev === id ? "" : id));

  const toggleFilter = (id: string) =>
    setSelectedFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Item name is required"); return; }
    const amount = parseFloat(defaultAmount);
    if (isNaN(amount) || amount < 0) { setError("A valid non-negative price is required"); return; }
    if (!selectedCategoryId) { setError("Please select a category"); return; }

    setLoading(true);
    setError("");
    try {
      const payload: CreateItemInput = {
        name: name.trim(),
        description: description.trim(),
        defaultAmount: amount,
        imageUrl: imageUrl.trim() || undefined,
        category: selectedCategoryId,
        filters: selectedFilterIds,
      };

      let saved: MenuItem;
      if (isEdit && item) {
        saved = await updateItem(item._id, payload);
      } else {
        saved = await createItem(payload);
      }
      onSuccess(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit Item" : "Add Item"}
          </h2>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <form id="itemForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Paneer Butter Masala"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Short description..."
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 299"
                required
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            {/* Category single-select (required) */}
            {categories.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Category *</label>
                  {selectedCategoryId && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId("")}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const selected = selectedCategoryId === cat._id;
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => toggleCategory(cat._id)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {selected && "✓ "}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters multi-select */}
            {filters.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Filters</label>
                  <span className="text-xs text-gray-400">
                    {selectedFilterIds.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => {
                    const selected = selectedFilterIds.includes(filter._id);
                    return (
                      <button
                        key={filter._id}
                        type="button"
                        onClick={() => toggleFilter(filter._id)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          selected
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                        }`}
                      >
                        {selected && "✓ "}
                        {filter.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="itemForm"
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
