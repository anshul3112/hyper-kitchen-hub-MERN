import { Inventory } from "../../../items/models/inventoryModel.js";
import { resolveSchedule } from "../../utils/resolveSchedule.js";

function getCurrentPrice(inv, now) {
  const { activePrice } = resolveSchedule(inv, now);
  if (activePrice != null) return Number(activePrice);
  return inv?.price != null ? Number(inv.price) : null;
}

/**
 * Returns top margin-eligible items for an outlet ordered by final score desc.
 *
 * Margin rules:
 * - Compute avgMargin from items that have baseCost:
 *     margin = (currentPrice - baseCost) / currentPrice
 * - If fewer than 5 items have baseCost, avgMargin defaults to 0.4
 * - For each item:
 *     - use real margin when baseCost exists and price is valid
 *     - otherwise use avgMargin
 * - finalScore = freqScore * (1 + 0.1 * margin)
 *
 * freqScore is read from frequencyItems (count) when provided, else falls back to 1.
 *
 * Eligibility rules:
 * - inventory.status must not be false
 * - quantity must be > 0
 * - schedule must not resolve to unavailable
 */
export async function getTopMarginBasedItems(
  outletId,
  { limit = 10, now = new Date(), frequencyItems = [] } = {},
) {
  const inventoryDocs = await Inventory.find({ outletId, status: { $ne: false } })
    .select("itemId quantity status prioritySlots priceSlots availabilitySlots price baseCost")
    .lean();

  const freqMap = new Map(
    (Array.isArray(frequencyItems) ? frequencyItems : []).map((entry) => [
      entry.itemId.toString(),
      Number(entry.count) || 0,
    ]),
  );

  const eligibleInventory = [];
  for (const inv of inventoryDocs) {
    const qty = Number(inv?.quantity) || 0;
    if (qty <= 0) continue;

    const { isAvailable } = resolveSchedule(inv, now);
    if (isAvailable === false) continue;

    eligibleInventory.push(inv);
  }

  let marginSum = 0;
  let marginCount = 0;

  for (const inv of eligibleInventory) {
    if (inv?.baseCost == null) continue;
    const currentPrice = getCurrentPrice(inv, now);
    if (currentPrice == null || currentPrice <= 0) continue;

    const margin = (currentPrice - Number(inv.baseCost)) / currentPrice;
    marginSum += margin;
    marginCount += 1;
  }

  const avgMargin = marginCount < 5 ? 0.4 : marginSum / marginCount;

  const eligible = [];

  for (const inv of eligibleInventory) {
    const itemId = inv.itemId.toString();
    const currentPrice = getCurrentPrice(inv, now);

    let margin = avgMargin;
    if (inv?.baseCost != null && currentPrice != null && currentPrice > 0) {
      margin = (currentPrice - Number(inv.baseCost)) / currentPrice;
    }

    const freqScore = freqMap.get(itemId) || 1;
    const marginScore = freqScore * (1 + 0.1 * margin);

    eligible.push({
      itemId,
      marginScore,
    });
  }

  return eligible
    .sort((a, b) => b.marginScore - a.marginScore)
    .slice(0, Math.max(1, Number(limit) || 10));
}
