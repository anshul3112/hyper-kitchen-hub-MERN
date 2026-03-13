import { getMergedRecommendationScores } from "./recommendationSourcesService.js";
import { filterRecommendationScores } from "./recommendationFilterService.js";

/**
 * Returns recommended items for the given outlet, filtered for availability.
 * Merges weighted signals from admin-configured time slots and outlet-hour
 * historical frequency, then sorts the final list by weighted score.
 *
 * Filtering:
 *  - item.status must be true (admin-enabled in catalogue)
 *  - inventory.status must not be false (admin-disabled at outlet level)
 *  - regular items: inventory.quantity must be > 0
 *  - combo items: quantity check is skipped — their stock is derived from
 *    component items and computed on the frontend (same as getKioskMenu logic)
 *  - resolveSchedule must return isAvailable !== false (when record exists)
 *
 * Returns [{ itemId, priority }] sorted by weighted priority descending.
 * Returns [] when no recommendation sources produce available items.
 */
export async function getRecommendedItems(outletId) {
  const now = new Date();
  const mergedScores = await getMergedRecommendationScores(outletId, now);
  return filterRecommendationScores(outletId, mergedScores, now);
}
