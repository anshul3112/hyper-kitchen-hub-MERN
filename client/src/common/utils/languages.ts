/**
 * Supported kiosk languages.
 * English is always shown on the kiosk and cannot be toggled off.
 * Each additional language tenant admins can enable must appear here.
 *
 * To add a new language: add its i18n translations under src/locales/<code>/
 * and add an entry to this map.
 */
export const LANGUAGE_META: Record<string, { code: string; nativeLabel: string }> = {
  English: { code: "en", nativeLabel: "English" },
  Hindi: { code: "hi", nativeLabel: "हिंदी" },
};

/** All language names the platform supports (mirrors server-side SUPPORTED_LANGUAGES). */
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_META);

/**
 * Return the localised string for a multilingual field.
 * Falls back to English if the requested language is absent or empty.
 */
export function localised(
  field: { en: string; [code: string]: string } | string | undefined | null,
  langCode: string,
): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[langCode] || field["en"] || "";
}
