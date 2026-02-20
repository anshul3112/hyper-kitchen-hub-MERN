import { useEffect, useRef, useState } from "react";
import {
  fetchCategories,
  fetchFilters,
  fetchItems,
  type MenuCategory,
  type MenuFilter,
  type MenuItem,
} from "../api";
import CategoriesTab from "./CategoriesTab";
import FiltersTab from "./FiltersTab";
import ItemsTab from "./ItemsTab";

const SUB_TABS = [
  { key: "items", label: "Items" },
  { key: "categories", label: "Categories" },
  { key: "filters", label: "Filters" },
] as const;

type SubTab = (typeof SUB_TABS)[number]["key"];

export default function TenantMenuPanel() {
  const [activeTab, setActiveTab] = useState<SubTab>("items");

  // Items state
  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const itemsFetched = useRef(false);

  // Categories state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const categoriesFetched = useRef(false);

  // Filters state
  const [filters, setFilters] = useState<MenuFilter[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState("");
  const filtersFetched = useRef(false);

  // Load all on mount so Stats and ItemsTab have data immediately
  useEffect(() => {
    loadItems();
    loadCategories();
    loadFilters();
  }, []);

  const loadItems = async () => {
    itemsFetched.current = true;
    setItemsLoading(true);
    setItemsError("");
    try {
      const data = await fetchItems();
      setItems(data);
    } catch (err: unknown) {
      setItemsError(err instanceof Error ? err.message : "Failed to fetch items");
    } finally {
      setItemsLoading(false);
    }
  };

  const loadCategories = async () => {
    categoriesFetched.current = true;
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err: unknown) {
      setCategoriesError(err instanceof Error ? err.message : "Failed to fetch categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadFilters = async () => {
    filtersFetched.current = true;
    setFiltersLoading(true);
    setFiltersError("");
    try {
      const data = await fetchFilters();
      setFilters(data);
    } catch (err: unknown) {
      setFiltersError(err instanceof Error ? err.message : "Failed to fetch filters");
    } finally {
      setFiltersLoading(false);
    }
  };

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "items" && !itemsLoading && (
              <span className="ml-1.5 text-xs text-gray-400">({items.length})</span>
            )}
            {tab.key === "categories" && !categoriesLoading && (
              <span className="ml-1.5 text-xs text-gray-400">({categories.length})</span>
            )}
            {tab.key === "filters" && !filtersLoading && (
              <span className="ml-1.5 text-xs text-gray-400">({filters.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Error banners */}
      {activeTab === "items" && itemsError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex justify-between items-center">
          <span>{itemsError}</span>
          <button onClick={loadItems} className="ml-4 underline text-red-700 hover:no-underline">
            Retry
          </button>
        </div>
      )}
      {activeTab === "categories" && categoriesError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex justify-between items-center">
          <span>{categoriesError}</span>
          <button onClick={loadCategories} className="ml-4 underline text-red-700 hover:no-underline">
            Retry
          </button>
        </div>
      )}
      {activeTab === "filters" && filtersError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600 flex justify-between items-center">
          <span>{filtersError}</span>
          <button onClick={loadFilters} className="ml-4 underline text-red-700 hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "items" && (
        <ItemsTab
          items={items}
          categories={categories}
          filters={filters}
          loading={itemsLoading}
          onItemsChange={setItems}
        />
      )}

      {activeTab === "categories" && (
        <CategoriesTab
          categories={categories}
          loading={categoriesLoading}
          onCategoriesChange={setCategories}
        />
      )}

      {activeTab === "filters" && (
        <FiltersTab
          filters={filters}
          loading={filtersLoading}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}
