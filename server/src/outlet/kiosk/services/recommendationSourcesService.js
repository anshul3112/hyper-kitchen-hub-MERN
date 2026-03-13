import { RecommendationSlot } from "../models/recommendationModel.js";
import { getTopItemsForOutletHour } from "./outletTimeSlotFrequencyService.js";
import { RECOMMENDATION_WEIGHTS } from "../config/recommendationWeights.js";

/**
 * Returns the first active recommendation slot whose time window covers
 * the current time for the given outlet.
 *
 * Time is stored as minutes-of-day (0-1439).
 */
export async function getActiveRecommendationSlot(outletId, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slot = await RecommendationSlot.findOne({
    outletId,
    isActive: true,
    startTime: { $lte: currentMinutes },
    endTime: { $gte: currentMinutes },
  }).lean();

  return slot || null;
}

function normalizeSourceEntries(entries, valueKey) {
  if (!entries.length) return [];

  const maxValue = Math.max(...entries.map((entry) => Number(entry[valueKey]) || 0), 0);
  if (maxValue <= 0) {
    return entries.map((entry) => ({ ...entry, normalizedScore: 0 }));
  }

  return entries.map((entry) => ({
    ...entry,
    normalizedScore: (Number(entry[valueKey]) || 0) / maxValue,
  }));
}

/**
 * Merges weighted recommendation signals from configured sources.
 * Returns [{ itemId, score }].
 */
export async function getMergedRecommendationScores(outletId, now = new Date()) {
  const config = RECOMMENDATION_WEIGHTS;
  const currentHour = now.getHours();

  const [slot, frequencyItems] = await Promise.all([
    config.sources.adminSlot.enabled
      ? getActiveRecommendationSlot(outletId, now)
      : Promise.resolve(null),
    config.sources.outletTimeSlotFrequency.enabled
      ? getTopItemsForOutletHour(
          outletId,
          currentHour,
          config.sources.outletTimeSlotFrequency.limit,
        )
      : Promise.resolve([]),
  ]);

  const adminSlotItems = [...(slot?.items || [])].sort((a, b) => b.priority - a.priority);
  const normalizedAdminEntries = normalizeSourceEntries(adminSlotItems, "priority");
  const normalizedFrequencyEntries = normalizeSourceEntries(frequencyItems, "count");

  const mergedScores = new Map();

  for (const entry of normalizedAdminEntries) {
    const itemId = entry.itemId.toString();
    const weightedScore = entry.normalizedScore * config.sources.adminSlot.bias;
    mergedScores.set(itemId, (mergedScores.get(itemId) || 0) + weightedScore);
  }

  for (const entry of normalizedFrequencyEntries) {
    const itemId = entry.itemId.toString();
    const weightedScore =
      entry.normalizedScore * config.sources.outletTimeSlotFrequency.bias;
    mergedScores.set(itemId, (mergedScores.get(itemId) || 0) + weightedScore);
  }

  return Array.from(mergedScores.entries()).map(([itemId, score]) => ({ itemId, score }));
}
