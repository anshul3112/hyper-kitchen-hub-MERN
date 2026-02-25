import { useState } from "react";
import { deleteItem, updateItem, type MenuItem, type MenuCategory, type MenuFilter } from "../api";
import AddEditItemModal from "./AddEditItemModal";

interface Props {
  items: MenuItem[];
  categories: MenuCategory[];
  filters: MenuFilter[];
  loading: boolean;
  onItemsChange: (updated: MenuItem[]) => void;
}

export default function ItemsTab({ items, categories, filters, loading, onItemsChange }: Props) {
  const [search, setSearch] = useState("");
  // undefined = modal closed, null = create new, MenuItem = edit
  const [modalTarget, setModalTarget] = useState<MenuItem | null | undefined>(undefined);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleToggleStatus = async (item: MenuItem) => {
    setTogglingId(item._id);
    setActionError("");
    try {
      const updated = await updateItem(item._id, { status: !item.status });
      onItemsChange(items.map((i) => (i._id === updated._id ? updated : i)));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete item "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item._id);
    setActionError("");
    try {
      await deleteItem(item._id);
      onItemsChange(items.filter((i) => i._id !== item._id));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuccess = (saved: MenuItem) => {
    const exists = items.some((i) => i._id === saved._id);
    if (exists) {
      onItemsChange(items.map((i) => (i._id === saved._id ? saved : i)));
    } else {
      onItemsChange([...items, saved]);
    }
    setModalTarget(undefined);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Items
            {!loading && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({items.length} total · {items.filter((i) => i.status).length} active)
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={() => setModalTarget(null)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors self-start sm:self-auto"
        >
          + Add Item
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items by name or description..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">Loading items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-gray-600 font-medium mb-1">No items yet</p>
          <p className="text-sm text-gray-400 mb-4">Add your first menu item to get started.</p>
          <button
            onClick={() => setModalTarget(null)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Add First Item
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">No items match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => {
            const isToggling = togglingId === item._id;
            const isDeleting = deletingId === item._id;

            return (
              <div
                key={item._id}
                className={`bg-white border rounded-lg overflow-hidden flex flex-col transition-opacity ${
                  !item.status ? "opacity-60" : ""
                } border-gray-200`}
              >
                {/* Image */}
                <div className="relative h-36 bg-white flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                      🍴
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <span
                    className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.status ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Body */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-blue-600 font-bold text-sm mt-0.5">
                      ₹{item.defaultAmount.toLocaleString("en-IN")}
                    </p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Category chip */}
                  {item.category && (
                    <div className="flex flex-wrap gap-1">
                      <span
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100"
                      >
                        {item.category.name}
                      </span>
                    </div>
                  )}

                  {/* Filter chips */}
                  {item.filters.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.filters.filter(Boolean).map((f) => (
                        <span
                          key={f._id}
                          className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100"
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex gap-1.5 flex-shrink-0">
                  {/* Edit — opens modal with full form incl. add/remove categories & filters */}
                  <button
                    onClick={() => setModalTarget(item)}
                    className="flex-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    title="Edit item (name, price, image, category, filters)"
                  >
                    Edit
                  </button>

                  {/* Toggle status */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    disabled={isToggling}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                      item.status
                        ? "text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                        : "text-green-700 bg-green-50 hover:bg-green-100"
                    }`}
                    title={item.status ? "Disable item" : "Enable item"}
                  >
                    {isToggling ? "..." : item.status ? "Disable" : "Enable"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    title="Delete item permanently"
                  >
                    {isDeleting ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {modalTarget !== undefined && (
        <AddEditItemModal
          item={modalTarget}
          categories={categories}
          filters={filters}
          onClose={() => setModalTarget(undefined)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
