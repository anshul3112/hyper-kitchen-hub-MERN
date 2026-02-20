import { useState } from "react";
import { createCategory, updateCategory, type MenuCategory } from "../api";

interface Props {
  category?: MenuCategory | null; // null = create, MenuCategory = edit
  onClose: () => void;
  onSuccess: (saved: MenuCategory) => void;
}

export default function AddEditCategoryModal({ category, onClose, onSuccess }: Props) {
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [status, setStatus] = useState(category?.status ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Category name is required"); return; }
    setLoading(true);
    setError("");
    try {
      let saved: MenuCategory;
      if (isEdit && category) {
        saved = await updateCategory(category._id, {
          name: name.trim(),
          imageUrl: imageUrl.trim() || undefined,
          status,
        });
      } else {
        saved = await createCategory({ name: name.trim(), imageUrl: imageUrl.trim() || undefined });
      }
      onSuccess(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit Category" : "Add Category"}
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
                placeholder="e.g. Starters, Main Course, Desserts"
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
                  id="categoryStatus"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="categoryStatus" className="text-sm text-gray-700">
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
                {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
