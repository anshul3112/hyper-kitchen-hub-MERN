import { OutletTimeSlotFrequency } from "../models/outletTimeSlotFrequencyModel.js";

/**
 * Returns top items ordered by frequency for a given outlet + hour.
 */
export async function getTopItemsForOutletHour(outletId, hour, limit = 10) {
  const hourKey = String(hour);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be an integer between 0 and 23");
  }

  const doc = await OutletTimeSlotFrequency.findOne({ outletId })
    .select("frequency")
    .lean();

  const hourFreq = (doc?.frequency && doc.frequency[hourKey]) || {};

  return Object.entries(hourFreq)
    .map(([itemId, count]) => ({ itemId, count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, Number(limit) || 10));
}
