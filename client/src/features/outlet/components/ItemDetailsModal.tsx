import { localised } from "../../../common/utils/languages";
import type { MenuItem, InventoryRecord } from "../api";

type Props = {
  item: MenuItem;
  inv: InventoryRecord | undefined;
  derivedQty?: number | null;
  onClose: () => void;
};

export default function ItemDetailsModal({ item, inv, derivedQty, onClose }: Props) {
  const isCombo = item.type === "combo";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">
                {localised(item.name, "en")}
              </h2>
              {isCombo && (
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Combo
                </span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.status
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {item.status ? "Active" : "Inactive"}
              </span>
            </div>
            {item.category && (
              <p className="text-xs text-gray-500 mt-0.5">
                {localised(item.category.name, "en")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Image */}
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={localised(item.name, "en")}
              className="w-full h-52 object-cover rounded-xl"
            />
          )}

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Description
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {localised(item.description, "en")}
              </p>
            </div>
          )}

          {/* Filters */}
          {item.filters && item.filters.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Filters / Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.filters.map((f) => (
                  <span
                    key={f._id}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium"
                  >
                    {localised(f.name, "en")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price & Inventory grid */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Pricing & Stock
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Default Price</p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{item.defaultAmount}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Outlet Price</p>
                {inv?.price != null ? (
                  <p className="text-lg font-bold text-blue-700">₹{inv.price}</p>
                ) : (
                  <p className="text-lg font-bold text-gray-400">
                    ₹{item.defaultAmount}
                    <span className="text-xs font-normal"> (default)</span>
                  </p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Quantity</p>
                {isCombo ? (
                  <p className="text-lg font-bold text-blue-700">
                    {derivedQty ?? 0}
                    <span className="text-xs font-normal text-blue-500"> auto</span>
                  </p>
                ) : inv != null ? (
                  <p
                    className={`text-lg font-bold ${
                      inv.quantity === 0 ? "text-red-500" : "text-gray-900"
                    }`}
                  >
                    {inv.quantity}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-red-400">0</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Prep Time</p>
                <p
                  className={`text-lg font-bold ${
                    (inv?.prepTime ?? 3) === 0 ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  {inv != null
                    ? inv.prepTime === 0
                      ? "Instant"
                      : `${inv.prepTime} min`
                    : "3 min"}
                </p>
              </div>
            </div>
          </div>

          {/* Order Type & other fields */}
          {inv && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Order Type</p>
                <p className="text-sm font-semibold text-gray-700 capitalize">
                  {inv.orderType === "both"
                    ? "Both"
                    : inv.orderType === "dineIn"
                    ? "Dine In"
                    : "Take Away"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Low-Stock Alert</p>
                <p className="text-sm font-semibold text-gray-700">
                  {inv.lowStockThreshold != null
                    ? `≤ ${inv.lowStockThreshold} units`
                    : "Disabled"}
                </p>
              </div>
              {inv.baseCost != null && (
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] text-gray-500 mb-0.5">Base Cost</p>
                  <p className="text-sm font-semibold text-teal-700">
                    ₹{inv.baseCost}
                  </p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-[11px] text-gray-500 mb-0.5">Kiosk</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    inv.status
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {inv.status ? "Visible" : "Hidden"}
                </span>
              </div>
            </div>
          )}

          {/* Combo breakdown */}
          {isCombo && item.comboItems && item.comboItems.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Combo Components
              </p>
              <div className="space-y-2">
                {item.comboItems.map((ci, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-200 text-blue-800 rounded-full text-xs font-bold">
                      {ci.quantity}
                    </span>
                    <span className="text-sm text-gray-700">
                      × Component item
                    </span>
                    <span className="ml-auto text-xs text-blue-500 font-mono truncate max-w-[8rem]">
                      {ci.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          {(item.createdAt || item.updatedAt) && (
            <div className="text-xs text-gray-400 border-t border-gray-100 pt-4 space-y-0.5">
              {item.createdAt && (
                <p>Created: {new Date(item.createdAt).toLocaleDateString()}</p>
              )}
              {item.updatedAt && (
                <p>Updated: {new Date(item.updatedAt).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
