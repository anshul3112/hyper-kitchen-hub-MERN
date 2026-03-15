import { useRef, useState } from "react";
import {
  createCategory,
  updateCategory,
  uploadItemImage,
  compressImage,
  type MenuCategory,
  type MultiLangString,
} from "../api";
import { LANGUAGE_META } from "../../../common/utils/languages";
import { MAX_TEXT_LENGTH, isAtTextLimit, trimToMaxLength } from "../../../common/utils/textLimits";

interface Props {
  category?: MenuCategory | null; // null = create, MenuCategory = edit
  kioskLanguages: string[];
  onClose: () => void;
  onSuccess: (saved: MenuCategory) => void;
}

export default function AddEditCategoryModal({ category, kioskLanguages, onClose, onSuccess }: Props) {
  const isEdit = Boolean(category);

  // English name is always required; other language names are optional
  const [nameEn, setNameEn] = useState(
    category?.name ? (category.name.en ?? "") : ""
  );
  const [nameTrans, setNameTrans] = useState<Record<string, string>>(
    category?.name
      ? Object.fromEntries(Object.entries(category.name).filter(([k]) => k !== "en"))
      : {}
  );
  const [status, setStatus] = useState(category?.status ?? true);

  // Image state – mirrors AddEditItemModal pattern
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(category?.imageUrl ?? "");
  const [imageRemoved, setImageRemoved] = useState(false); // tracks explicit removal
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); // "Compressing…" | "Uploading…"
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) { setError("Category name (English) is required"); return; }
    setLoading(true);
    setError("");
    try {
      // Upload new image if picked
      let finalImageUrl = imageUrl;
      if (imageFile) {
        setImageUploading(true);
        try {
          setUploadStatus("Compressing…");
          const compressed = await compressImage(imageFile);
          setUploadStatus("Uploading…");
          finalImageUrl = await uploadItemImage(compressed, "categories");
          setImageUrl(finalImageUrl);
        } finally {
          setImageUploading(false);
          setUploadStatus("");
        }
      }

      // image logic:
      // - new file uploaded  → use new key
      // - explicitly removed → send "" so backend clears imageKey
      // - unchanged          → send undefined (don't touch)
      const resolvedImageUrl = imageFile
        ? finalImageUrl.trim() || undefined
        : imageRemoved
        ? ""
        : undefined;

      // Build multilingual name object
      const namePayload: MultiLangString = { en: nameEn.trim() };
      for (const lang of kioskLanguages) {
        if (lang === "English") continue;
        const meta = LANGUAGE_META[lang];
        if (meta && nameTrans[meta.code]?.trim()) {
          namePayload[meta.code] = nameTrans[meta.code].trim();
        }
      }

      let saved: MenuCategory;
      if (isEdit && category) {
        saved = await updateCategory(category._id, {
          name: namePayload,
          ...(resolvedImageUrl !== undefined && { imageUrl: resolvedImageUrl }),
          status,
        });
      } else {
        saved = await createCategory({
          name: namePayload,
          ...(resolvedImageUrl !== undefined && { imageUrl: resolvedImageUrl }),
        });
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (English) *</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(trimToMaxLength(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Starters, Main Course, Desserts"
                required
                autoFocus
                maxLength={MAX_TEXT_LENGTH}
              />
              {isAtTextLimit(nameEn) ? (
                <p className="mt-1 text-xs text-amber-600">Maximum 100 characters reached.</p>
              ) : null}
            </div>
            {/* Translation inputs for enabled kiosk languages */}
            {kioskLanguages
              .filter((lang) => lang !== "English")
              .map((lang) => {
                const meta = LANGUAGE_META[lang];
                if (!meta) return null;
                return (
                  <div key={lang}>
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
            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>

              {/* Upload status indicator */}
              {imageUploading && (
                <p className="mb-2 text-xs text-blue-600 font-medium">{uploadStatus}</p>
              )}

              {/* Preview + remove button */}
              {imagePreview && !imageUploading && (
                <div className="mb-2 relative w-full h-36 rounded overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setImageUrl("");
                      setImageFile(null);
                      setImageRemoved(true);
                    }}
                    className="absolute top-1 right-1 bg-white/80 hover:bg-white text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
                    title="Remove image"
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
                disabled={imageUploading}
                className="w-full border border-dashed border-gray-300 rounded px-3 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
              >
                {imagePreview ? "Change image" : "Choose image"}
              </button>
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
                disabled={loading || imageUploading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading || imageUploading
                  ? imageUploading
                    ? uploadStatus || "Uploading…"
                    : "Saving…"
                  : isEdit
                  ? "Save Changes"
                  : "Add Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
