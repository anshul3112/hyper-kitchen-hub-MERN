import { ApiError } from "./ApiError.js";

/**
 * Maps a MongoDB duplicate-key error (code 11000) to a human-readable ApiError.
 *
 * Usage:
 *   try { await doc.save(); }
 *   catch (err) { throw parseDuplicateKeyError(err) ?? err; }
 *
 * @param {Error} err
 * @param {Record<string, string>} [fieldMessages] - optional per-field overrides
 * @returns {ApiError|null} ApiError if code === 11000, otherwise null
 */
export function parseDuplicateKeyError(err, fieldMessages = {}) {
  if (err.code !== 11000) return null;

  // err.keyValue e.g. { email: 'a@b.com' } or { name: 'Veg', tenantId: ObjectId }
  const conflictingField = Object.keys(err.keyValue ?? {})[0] ?? "";

  const defaults = {
    email: "Email is already in use",
    phoneNumber: "Phone number is already in use",
    name: "Name already exists",
    "contacts.email": "Email is already in use",
    "contacts.phoneNumber": "Phone number is already in use",
  };

  const message =
    fieldMessages[conflictingField] ??
    defaults[conflictingField] ??
    "A record with this value already exists";

  return new ApiError(409, message);
}
