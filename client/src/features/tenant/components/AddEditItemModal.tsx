import { useRef, useState } from "react";
import {
  createItem,
  updateItem,
  uploadItemImage,
  compressImage,
  type MenuItem,
  type MenuCategory,
  type MenuFilter,
  type CreateItemInput,
  type MultiLangString,
} from "../api";
import { LANGUAGE_META } from "../../../common/utils/languages";
import { MAX_TEXT_LENGTH, isAtTextLimit, trimToMaxLength } from "../../../common/utils/textLimits";

interface Props {
  item?: MenuItem | null; // null = create, MenuItem = edit
  items: MenuItem[];      // all items for combo sub-item selection
  categories: MenuCategory[];
  filters: MenuFilter[];
  kioskLanguages: string[];
  onClose: () => void;
  onSuccess: (saved: MenuItem) => void;
}

export default function AddEditItemModal({
  item,
  items,
  categories,
  filters,
  kioskLanguages,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = Boolean(item);

  // English name/description is always required; other languages are optional
  const [nameEn, setNameEn] = useState(
    item?.name ? (item.name.en ?? "") : ""
  );
  const [nameTrans, setNameTrans] = useState<Record<string, string>>(
    item?.name
      ? Object.fromEntries(Object.entries(item.name).filter(([k]) => k !== "en"))
      : {}
  );
  const [descEn, setDescEn] = useState(
    item?.description ? (item.description.en ?? "") : ""
  );
  const [descTrans, setDescTrans] = useState<Record<string, string>>(
    item?.description
      ? Object.fromEntries(Object.entries(item.description).filter(([k]) => k !== "en"))
      : {}
  );
  const [defaultAmount, setDefaultAmount] = useState<string>(
    item?.defaultAmount !== undefined ? String(item.defaultAmount) : "",
  );
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(item?.imageUrl ?? "");
  const [imageRemoved, setImageRemoved] = useState(false); // tracks explicit removal
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); // "Compressing…" | "Uploading…"
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single required category
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    item?.category?._id ?? "",
  );
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>(
    () => (item?.filters ?? []).map((f) => f._id),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Combo fields ─────────────────────────────────────────────────────────────
  const [itemType, setItemType] = useState<'single' | 'combo'>(item?.type ?? 'single');
  const [comboEntries, setComboEntries] = useState<{ item: string; quantity: number }[]>(
    item?.comboItems?.map((c) => ({ item: c.item, quantity: c.quantity })) ?? []
  );
  const [minMatchCount, setMinMatchCount] = useState<string>(
    item?.minMatchCount !== undefined ? String(item.minMatchCount) : "1"
  );

  /** Toggle an item in/out of the combo entry list. Adding defaults to quantity 1. */
  const toggleComboItem = (id: string) =>
    setComboEntries((prev) =>
      prev.some((e) => e.item === id)
        ? prev.filter((e) => e.item !== id)
        : [...prev, { item: id, quantity: 1 }]
    );

  /** Update the required quantity for a specific combo component */
  const setComboItemQuantity = (id: string, qty: number) =>
    setComboEntries((prev) =>
      prev.map((e) => (e.item === id ? { ...e, quantity: Math.max(1, qty) } : e))
    );

  const toggleCategory = (id: string) =>
    setSelectedCategoryId((prev) => (prev === id ? "" : id));

  const toggleFilter = (id: string) =>
    setSelectedFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) { setError("Item name (English) is required"); return; }
    const amount = parseFloat(defaultAmount);
    if (isNaN(amount) || amount < 0) { setError("A valid non-negative price is required"); return; }
    if (!selectedCategoryId) { setError("Please select a category"); return; }
    if (itemType === 'combo' && comboEntries.length === 0) {
      setError("Please select at least one item for the combo"); return;
    }
    const matchCount = parseInt(minMatchCount, 10);
    if (itemType === 'combo' && (isNaN(matchCount) || matchCount < 1 || matchCount > comboEntries.length)) {
      setError(`Min match count must be between 1 and ${comboEntries.length}`); return;
    }

    setLoading(true);
    setError("");
    try {
      // If a new file was picked, compress then upload it
      let finalImageUrl = imageUrl;
      if (imageFile) {
        setImageUploading(true);
        try {
          // Phase 1: compress client-side to ≤ 300 KB
          setUploadStatus("Compressing…");
          const compressed = await compressImage(imageFile);

          // Phase 2: presigned URL → PUT straight to S3
          setUploadStatus("Uploading…");
          finalImageUrl = await uploadItemImage(compressed, "items");
          setImageUrl(finalImageUrl);
        } finally {
          setImageUploading(false);
          setUploadStatus("");
        }
      }

      // Build multilingual name and description objects
      const namePayload: MultiLangString = { en: nameEn.trim() };
      const descPayload: MultiLangString = { en: descEn.trim() };
      for (const lang of kioskLanguages) {
        if (lang === "English") continue;
        const meta = LANGUAGE_META[lang];
        if (meta) {
          if (nameTrans[meta.code]?.trim()) namePayload[meta.code] = nameTrans[meta.code].trim();
          if (descTrans[meta.code]?.trim()) descPayload[meta.code] = descTrans[meta.code].trim();
        }
      }

      const payload: CreateItemInput = {
        name: namePayload,
        description: descPayload,
        defaultAmount: amount,
        // If a new file was uploaded → use its key.
        // If image was explicitly removed → send "" so backend clears imageKey.
        // Otherwise → send undefined (leave unchanged).
        imageUrl: imageFile
          ? finalImageUrl.trim() || undefined
          : imageRemoved
          ? ""
          : undefined,
        category: selectedCategoryId,
        filters: selectedFilterIds,
        type: itemType,
        comboItems: itemType === 'combo' ? comboEntries : [],
        minMatchCount: itemType === 'combo' ? parseInt(minMatchCount, 10) : 1,
      };

      let saved: MenuItem;
      if (isEdit && item) {
        saved = await updateItem(item._id, payload);
      } else {
        saved = await createItem(payload);
      }
      onSuccess(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit Item" : "Add Item"}
          </h2>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <form id="itemForm" onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) *</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(trimToMaxLength(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Paneer Butter Masala"
                required
                autoFocus
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(nameEn) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
            </div>
            {/* Translation name inputs */}
            {kioskLanguages
              .filter((lang) => lang !== "English")
              .map((lang) => {
                const meta = LANGUAGE_META[lang];
                if (!meta) return null;
                return (
                  <div key={`name-${lang}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name ({meta.nativeLabel})
                    </label>
                    <input
                      type="text"
                      value={nameTrans[meta.code] ?? ""}
                      onChange={(e) =>
                        setNameTrans((prev) => ({ ...prev, [meta.code]: trimToMaxLength(e.target.value) }))
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder={`Translation in ${meta.nativeLabel}`}
                      maxLength={MAX_TEXT_LENGTH}
                    />
                    {isAtTextLimit(nameTrans[meta.code] ?? "") ? (
                      <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
                    ) : null}
                  </div>
                );
              })}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (English)
              </label>
              <textarea
                value={descEn}
                onChange={(e) => setDescEn(trimToMaxLength(e.target.value))}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Short description..."
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(descEn) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
            </div>
            {/* Translation description inputs */}
            {kioskLanguages
              .filter((lang) => lang !== "English")
              .map((lang) => {
                const meta = LANGUAGE_META[lang];
                if (!meta) return null;
                return (
                  <div key={`desc-${lang}`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description ({meta.nativeLabel})
                    </label>
                    <textarea
                      value={descTrans[meta.code] ?? ""}
                      onChange={(e) =>
                        setDescTrans((prev) => ({ ...prev, [meta.code]: trimToMaxLength(e.target.value) }))
                      }
                      rows={2}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                      placeholder={`Description in ${meta.nativeLabel}`}
                      maxLength={MAX_TEXT_LENGTH}
                    />
                    {isAtTextLimit(descTrans[meta.code] ?? "") ? (
                      <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
                    ) : null}
                  </div>
                );
              })}

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. 299"
                required
              />
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>

              {/* Preview */}
              {imagePreview && (
                <div className="mb-2 relative w-full h-56 rounded overflow-hidden border border-gray-200 bg-gray-50 p-3 flex items-center justify-center">
                  <img src={imagePreview} alt="preview" className="max-w-full max-h-full object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(""); setImageUrl(""); setImageFile(null); setImageRemoved(true); }}
                    className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
                  >
                    ✕
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  // 10 MB client-side guard
                  if (f.size > 10 * 1024 * 1024) {
                    setError("Image must be 10 MB or smaller");
                    e.target.value = "";
                    return;
                  }
                  setError("");
                  setImageFile(f);
                  setImagePreview(URL.createObjectURL(f));
                  setImageRemoved(false);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-gray-300 rounded px-3 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                {imagePreview ? "Change image" : "Choose image"}
              </button>
            </div>

            {/* Category single-select (required) */}
            {categories.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Category *</label>
                  {selectedCategoryId && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId("")}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const selected = selectedCategoryId === cat._id;
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => toggleCategory(cat._id)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {selected && "✓ "}
                        <span className="inline-block max-w-[160px] truncate align-bottom" title={cat.name.en}>{cat.name.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters multi-select */}
            {filters.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Filters</label>
                  <span className="text-xs text-gray-400">
                    {selectedFilterIds.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => {
                    const selected = selectedFilterIds.includes(filter._id);
                    return (
                      <button
                        key={filter._id}
                        type="button"
                        onClick={() => toggleFilter(filter._id)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          selected
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                        }`}
                      >
                        {selected && "✓ "}
                        <span className="inline-block max-w-[160px] truncate align-bottom" title={filter.name.en}>{filter.name.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Item Type toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
              <div className="flex gap-2">
                {(['single', 'combo'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemType(t)}
                    className={`px-4 py-1.5 text-sm rounded-full border font-medium transition-colors ${
                      itemType === t
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {t === 'single' ? 'Single' : 'Combo / Meal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Combo sub-item picker (only when type = combo) */}
            {itemType === 'combo' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Combo Items <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">— select items and set required quantity each</span>
                  </label>
                  {items.filter((i) => i._id !== item?._id).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No other items available.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                      {items
                        .filter((i) => i._id !== item?._id)
                        .map((i) => {
                          const entry = comboEntries.find((e) => e.item === i._id);
                          const checked = Boolean(entry);
                          return (
                            <div
                              key={i._id}
                              className={`flex items-center gap-3 px-3 py-2 ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleComboItem(i._id)}
                                className="accent-blue-600 w-4 h-4 flex-shrink-0"
                              />
                              <span className="text-sm text-gray-800 flex-1 truncate" title={i.name.en}>{i.name.en}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0">₹{i.defaultAmount}</span>
                              {checked && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <label className="text-xs text-gray-500">Qty:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={entry?.quantity ?? 1}
                                    onChange={(e) => setComboItemQuantity(i._id, parseInt(e.target.value, 10) || 1)}
                                    className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Match Count
                    <span className="text-xs text-gray-400 font-normal ml-1">— min items from combo needed in cart to trigger suggestion</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={comboEntries.length || 1}
                    value={minMatchCount}
                    onChange={(e) => setMinMatchCount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 2"
                  />
                  {comboEntries.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {comboEntries.length} item{comboEntries.length !== 1 ? "s" : ""} selected — suggestion triggers when ≥ {minMatchCount} {Number(minMatchCount) === 1 ? "is" : "are"} in cart.
                    </p>
                  )}
                </div>
              </>
            )}
          </form>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="itemForm"
            disabled={loading || imageUploading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {imageUploading ? (uploadStatus || "Processing…") : loading ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
