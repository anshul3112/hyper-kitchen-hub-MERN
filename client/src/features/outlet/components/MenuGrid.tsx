import { useState } from "react";
import type { MenuCategory, MenuFilter, MenuItem } from "../api";

type Props = {
  categories: MenuCategory[];
  filters: MenuFilter[];
  items: MenuItem[];
};

export default function MenuGrid({ categories, filters, items }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const visibleItems = items.filter((item) => {
    if (!item.status) return false;

    if (selectedCategory !== "all") {
      const hasCategory = item.categories.some((c) => c._id === selectedCategory);
      if (!hasCategory) return false;
    }

    if (selectedFilter !== "all") {
      const hasFilter = item.filters.some((f) => f._id === selectedFilter);
      if (!hasFilter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !(item.description ?? "").toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div>
      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selectedCategory === "all"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
          }`}
        >
          All Categories
        </button>
        {categories.filter((c) => c.status).map((cat) => (
          <button
            key={cat._id}
            onClick={() => setSelectedCategory(cat._id === selectedCategory ? "all" : cat._id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === cat._id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      {filters.filter((f) => f.isActive).length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedFilter === "all"
                ? "bg-orange-500 text-white"
                : "bg-orange-50 text-orange-600 hover:bg-orange-100"
            }`}
          >
            All Filters
          </button>
          {filters.filter((f) => f.isActive).map((filt) => (
            <button
              key={filt._id}
              onClick={() => setSelectedFilter(filt._id === selectedFilter ? "all" : filt._id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedFilter === filt._id
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100"
              }`}
            >
              {filt.name}
            </button>
          ))}
        </div>
      )}

      {/* Items count */}
      <p className="text-xs text-gray-400 mb-4">
        Showing {visibleItems.length} of {items.filter((i) => i.status).length} active items
      </p>

      {/* Grid */}
      {visibleItems.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-sm">No items match the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleItems.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Image */}
              <div className="h-32 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🍴</span>
                )}
              </div>

              {/* Details */}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-blue-600">
                    ₹{item.defaultAmount}
                  </span>
                  {item.filters.length > 0 && (
                    <div className="flex gap-1">
                      {item.filters.slice(0, 2).map((f) => (
                        <span
                          key={f._id}
                          className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded"
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
