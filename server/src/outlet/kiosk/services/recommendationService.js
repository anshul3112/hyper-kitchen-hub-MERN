import { RecommendationSlot } from "../models/recommendationModel.js";
import { Items } from "../../../items/models/itemModel.js";
import { Inventory } from "../../../items/models/inventoryModel.js";
import { resolveSchedule } from "../../utils/resolveSchedule.js";

/**
 * Returns the first active recommendation slot whose time window covers
 * the current time for the given outlet.
 *
 * Time is stored as minutes-of-day (0–1439) to match inventory schedule slots.
 */
export async function getActiveRecommendationSlot(outletId) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slot = await RecommendationSlot.findOne({
    outletId,
    isActive: true,
    startTime: { $lte: currentMinutes },
    endTime: { $gte: currentMinutes },
  }).lean();

  return slot || null;
}

/**
 * Returns recommended items for the given outlet, filtered for availability.
 *
 * Filtering:
 *  - item.status must be true (admin-enabled in catalogue)
 *  - inventory.status must not be false (admin-disabled at outlet level)
 *  - regular items: inventory.quantity must be > 0
 *  - combo items: quantity check is skipped — their stock is derived from
 *    component items and computed on the frontend (same as getKioskMenu logic)
 *  - resolveSchedule must return isAvailable !== false (when record exists)
 *
 * Returns [{ itemId, priority }] sorted by priority descending.
 * Returns [] when no active slot exists or all items are filtered out.
 */
export async function getRecommendedItems(outletId) {
  const slot = await getActiveRecommendationSlot(outletId);
  if (!slot || !slot.items || slot.items.length === 0) return [];

  // Sort slot items by priority descending once
  const slotItems = [...slot.items].sort((a, b) => b.priority - a.priority);
  const itemIds = slotItems.map((si) => si.itemId);

  const now = new Date();

  // Batch-fetch items and inventory in one round-trip each
  // Select `type` so we can skip quantity checks for combos
  const [itemDocs, inventoryDocs] = await Promise.all([
    Items.find({ _id: { $in: itemIds }, status: true })
      .select("_id type")
      .lean(),
    Inventory.find({ outletId, itemId: { $in: itemIds } })
      .select("itemId status quantity prioritySlots priceSlots availabilitySlots")
      .lean(),
  ]);

  // Build sets/maps for O(1) lookups
  const enabledItemIds = new Set(itemDocs.map((d) => d._id.toString()));
  const comboItemIds = new Set(
    itemDocs.filter((d) => d.type === "combo").map((d) => d._id.toString())
  );
  const inventoryMap = new Map(
    inventoryDocs.map((inv) => [inv.itemId.toString(), inv])
  );

  const result = [];
  for (const { itemId, priority } of slotItems) {
    const idStr = itemId.toString();

    // Must exist in catalogue and be enabled
    if (!enabledItemIds.has(idStr)) continue;

    const isCombo = comboItemIds.has(idStr);
    const inv = inventoryMap.get(idStr);

    if (!isCombo) {
      // Regular items require an inventory record, non-zero stock, and not admin-disabled
      if (!inv) continue;
      if (inv.status === false) continue;
      if (inv.quantity === 0) continue;

      // Schedule-based availability check
      const { isAvailable } = resolveSchedule(inv, now);
      if (isAvailable === false) continue;
    } else {
      // Combo items: stock is derived from component items on the frontend.
      // Only check admin-disabled and schedule if an inventory record exists.
      if (inv) {
        if (inv.status === false) continue;
        const { isAvailable } = resolveSchedule(inv, now);
        if (isAvailable === false) continue;
      }
    }

    result.push({ itemId: idStr, priority });
  }

  return result;
}
