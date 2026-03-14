import { useTranslation } from "react-i18next";
import "../../../i18n";
import type { EnrichedMenuItem } from "../api";
import { localised } from "../../../common/utils/languages";

export type ComboSuggestion = {
  combo: EnrichedMenuItem;
  matchingItemIds: string[];
  savings: number;
  /** Each component item with how many are needed per combo unit */
  comboItemDetails: { name: string; quantity: number }[];
};

type Props = {
  suggestions: ComboSuggestion[];
  onUpgrade: (suggestion: ComboSuggestion) => void;
  onClose: () => void;
};

export default function ComboUpgradeModal({ suggestions, onUpgrade, onClose }: Props) {
  const { t, i18n } = useTranslation("common");
  if (suggestions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4 pointer-events-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden pointer-events-auto animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-600">
          <p className="text-sm font-bold text-white">💡 {t("bundleAndSave")}</p>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none font-bold transition-colors"
            aria-label="Close combo suggestions"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-gray-500 px-4 pt-3">
          {t("bundleDeal")}
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
                  alt={localised(s.combo.name, i18n.language)}
                  className="w-full h-28 object-contain rounded-xl bg-gray-50"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800">{localised(s.combo.name, i18n.language)}</p>
                <p className="text-xs text-gray-500">
                  ₹{s.combo.displayPrice}
                  {s.savings > 0 && (
                    <span className="ml-1.5 text-green-600 font-semibold">
                      · {t("saveAmount", { amount: s.savings })}
                    </span>
                  )}
                </p>
                {/* Items in this combo */}
                {s.comboItemDetails.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {s.comboItemDetails.map((detail, i) => (
                      <li key={i} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="text-purple-400">•</span>
                        <span className="font-semibold text-purple-700">{detail.quantity}×</span>
                        {detail.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => onUpgrade(s)}
                className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-3 py-1.5 rounded-xl transition-all"
              >
                {t("addCombo")} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
