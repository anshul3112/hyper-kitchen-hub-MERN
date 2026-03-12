/**
 * All languages supported by the platform.
 * English is always the default and cannot be removed.
 * New entries here automatically become available as selectable kiosk languages.
 */
export const SUPPORTED_LANGUAGES = ['English', 'Hindi'];

/**
 * Maps each supported language display-name to its i18n locale code.
 * When adding a new language, add its entry here and in SUPPORTED_LANGUAGES.
 */
export const LANGUAGE_CODES = {
  English: 'en',
  Hindi: 'hi',
};
