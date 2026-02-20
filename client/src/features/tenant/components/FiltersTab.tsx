import { useState } from "react";
import { deleteFilter, type MenuFilter } from "../api";
import AddEditFilterModal from "./AddEditFilterModal";

interface Props {
  filters: MenuFilter[];
  loading: boolean;
  onFiltersChange: (updated: MenuFilter[]) => void;
}

export default function FiltersTab({ filters, loading, onFiltersChange }: Props) {
  // undefined = modal closed, null = create new, MenuFilter = edit existing
  const [modalTarget, setModalTarget] = useState<MenuFilter | null | undefined>(undefined);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (filter: MenuFilter) => {
    if (!confirm(`Delete filter "${filter.name}"? This cannot be undone.`)) return;
    setDeletingId(filter._id);
    setDeleteError("");
    try {
      await deleteFilter(filter._id);
      onFiltersChange(filters.filter((f) => f._id !== filter._id));
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete filter");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = (saved: MenuFilter) => {
    const exists = filters.some((f) => f._id === saved._id);
    if (exists) {
      onFiltersChange(filters.map((f) => (f._id === saved._id ? saved : f)));
    } else {
      onFiltersChange([...filters, saved]);
    }
    setModalTarget(undefined);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Filters
            {!loading && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filters.length})
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Label items as Veg, Non-Veg, Spicy, etc.
          </p>
        </div>
        <button
          onClick={() => setModalTarget(null)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
        >
          + Add Filter
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {deleteError}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">Loading filters...</p>
        </div>
      ) : filters.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-gray-600 font-medium mb-1">No filters yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Create filters to tag items (e.g. Veg, Non-Veg, Spicy).
          </p>
          <button
            onClick={() => setModalTarget(null)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Add First Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filters.map((filter) => (
            <div
              key={filter._id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                {filter.imageUrl ? (
                  <img
                    src={filter.imageUrl}
                    alt={filter.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-xs">🏷</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{filter.name}</p>
                  <span
                    className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                      filter.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {filter.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 ml-3">
                <button
                  onClick={() => setModalTarget(filter)}
                  className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(filter)}
                  disabled={deletingId === filter._id}
                  className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                >
                  {deletingId === filter._id ? "..." : "Del"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTarget !== undefined && (
        <AddEditFilterModal
          filter={modalTarget}
          onClose={() => setModalTarget(undefined)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
