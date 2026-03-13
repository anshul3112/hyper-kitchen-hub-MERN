import { Items } from "../../../items/models/itemModel.js";
import { Inventory } from "../../../items/models/inventoryModel.js";
import { resolveSchedule } from "../../utils/resolveSchedule.js";
import { RECOMMENDATION_WEIGHTS } from "../config/recommendationWeights.js";

function isItemAvailableForRecommendation(itemId, enabledItemIds, comboItemIds, inventoryMap, now) {
  if (!enabledItemIds.has(itemId)) return false;

  const isCombo = comboItemIds.has(itemId);
  const inv = inventoryMap.get(itemId);

  if (!isCombo) {
    if (!inv) return false;
    if (inv.status === false) return false;
    if (inv.quantity === 0) return false;

    const { isAvailable } = resolveSchedule(inv, now);
    if (isAvailable === false) return false;

    return true;
  }

  if (inv) {
    if (inv.status === false) return false;
    const { isAvailable } = resolveSchedule(inv, now);
    if (isAvailable === false) return false;
  }

  return true;
}

/**
 * Filters merged recommendation scores by item/inventory availability and
 * Returns [{ itemId, priority }] sorted by score descending.
 */
export async function filterRecommendationScores(outletId, mergedScores, now = new Date()) {
  if (!mergedScores?.length) return [];

  const candidateItemIds = Array.from(new Set(mergedScores.map((entry) => entry.itemId.toString())));
  if (candidateItemIds.length === 0) return [];

  const [itemDocs, inventoryDocs] = await Promise.all([
    Items.find({ _id: { $in: candidateItemIds }, status: true })
      .select("_id type")
      .lean(),
    Inventory.find({ outletId, itemId: { $in: candidateItemIds } })
      .select("itemId status quantity prioritySlots priceSlots availabilitySlots")
      .lean(),
  ]);

  const enabledItemIds = new Set(itemDocs.map((d) => d._id.toString()));
  const comboItemIds = new Set(
    itemDocs.filter((d) => d.type === "combo").map((d) => d._id.toString()),
  );
  const inventoryMap = new Map(inventoryDocs.map((inv) => [inv.itemId.toString(), inv]));

  return mergedScores
    .filter(({ itemId, score }) => {
      if ((Number(score) || 0) <= 0) return false;
      return isItemAvailableForRecommendation(
        itemId,
        enabledItemIds,
        comboItemIds,
        inventoryMap,
        now,
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, RECOMMENDATION_WEIGHTS.maxReturnedItems)
    .map(({ itemId, score }) => ({
      itemId,
      priority: Number(Number(score).toFixed(4)),
    }));
}
