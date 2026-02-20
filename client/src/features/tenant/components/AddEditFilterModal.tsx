import { useState } from "react";
import { createFilter, updateFilter, type MenuFilter } from "../api";

interface Props {
  filter?: MenuFilter | null; // null = create, MenuFilter = edit
  onClose: () => void;
  onSuccess: (saved: MenuFilter) => void;
}

export default function AddEditFilterModal({ filter, onClose, onSuccess }: Props) {
  const isEdit = Boolean(filter);
  const [name, setName] = useState(filter?.name ?? "");
  const [imageUrl, setImageUrl] = useState(filter?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(filter?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Filter name is required"); return; }
    setLoading(true);
    setError("");
    try {
      let saved: MenuFilter;
      if (isEdit && filter) {
        saved = await updateFilter(filter._id, {
          name: name.trim(),
          imageUrl: imageUrl.trim() || undefined,
          isActive,
        });
      } else {
        saved = await createFilter({ name: name.trim(), imageUrl: imageUrl.trim() || undefined });
      }
      onSuccess(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save filter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit Filter" : "Add Filter"}
          </h2>
        </div>
        <div className="px-6 py-4">
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Veg, Non-Veg, Spicy"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
            {isEdit && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="filterActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="filterActive" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Filter"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
