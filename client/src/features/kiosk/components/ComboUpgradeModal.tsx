import type { EnrichedMenuItem } from "../api";

export type ComboSuggestion = {
  combo: EnrichedMenuItem;
  matchingItemIds: string[];
  savings: number;
  comboItemNames: string[];
};

type Props = {
  suggestions: ComboSuggestion[];
  onUpgrade: (suggestion: ComboSuggestion) => void;
  onClose: () => void;
};

export default function ComboUpgradeModal({ suggestions, onUpgrade, onClose }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-72 pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-600">
          <p className="text-sm font-bold text-white">💡 Bundle &amp; Save</p>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none font-bold transition-colors"
            aria-label="Close combo suggestions"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-gray-500 px-4 pt-3">
          Items in your cart can be bundled for a better deal!
        </p>

        {/* Suggestions */}
        <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
          {suggestions.map((s) => (
            <div
              key={s.combo._id}
              className="flex flex-col gap-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0"
            >
              {/* Combo image */}
              {s.combo.imageUrl && (
                <img
                  src={s.combo.imageUrl}
                  alt={s.combo.name}
                  className="w-full h-28 object-cover rounded-xl"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800">{s.combo.name}</p>
                <p className="text-xs text-gray-500">
                  ₹{s.combo.displayPrice}
                  {s.savings > 0 && (
                    <span className="ml-1.5 text-green-600 font-semibold">
                      · Save ₹{s.savings}
                    </span>
                  )}
                </p>
                {/* Items in this combo */}
                {s.comboItemNames.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {s.comboItemNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="text-purple-400">•</span>
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => onUpgrade(s)}
                className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-3 py-1.5 rounded-xl transition-all"
              >
                Add Combo →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
