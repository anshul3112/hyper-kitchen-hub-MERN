import { useState } from "react";
import { deleteCategory, type MenuCategory } from "../api";
import AddEditCategoryModal from "./AddEditCategoryModal";

interface Props {
  categories: MenuCategory[];
  loading: boolean;
  onCategoriesChange: (updated: MenuCategory[]) => void;
}

export default function CategoriesTab({ categories, loading, onCategoriesChange }: Props) {
  // undefined = modal closed, null = create new, MenuCategory = edit existing
  const [modalTarget, setModalTarget] = useState<MenuCategory | null | undefined>(undefined);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (category: MenuCategory) => {
    if (!confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;
    setDeletingId(category._id);
    setDeleteError("");
    try {
      await deleteCategory(category._id);
      onCategoriesChange(categories.filter((c) => c._id !== category._id));
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = (saved: MenuCategory) => {
    const exists = categories.some((c) => c._id === saved._id);
    if (exists) {
      onCategoriesChange(categories.map((c) => (c._id === saved._id ? saved : c)));
    } else {
      onCategoriesChange([...categories, saved]);
    }
    setModalTarget(undefined);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Categories
            {!loading && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({categories.length})
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Group items into Starters, Mains, Desserts, etc.
          </p>
        </div>
        <button
          onClick={() => setModalTarget(null)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
        >
          + Add Category
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {deleteError}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-gray-600 font-medium mb-1">No categories yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Create categories to organise your menu items.
          </p>
          <button
            onClick={() => setModalTarget(null)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Add First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 text-xs">📂</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{cat.name}</p>
                  <span
                    className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                      cat.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {cat.status ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 ml-3">
                <button
                  onClick={() => setModalTarget(cat)}
                  className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  disabled={deletingId === cat._id}
                  className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                >
                  {deletingId === cat._id ? "..." : "Del"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTarget !== undefined && (
        <AddEditCategoryModal
          category={modalTarget}
          onClose={() => setModalTarget(undefined)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
