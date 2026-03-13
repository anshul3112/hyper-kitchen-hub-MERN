import { Inventory } from "../../../items/models/inventoryModel.js";
import { resolveSchedule } from "../../utils/resolveSchedule.js";

/**
 * Returns top in-stock items for the outlet ordered by quantity desc.
 *
 * Low-stock exclusion rules:
 * - If lowStockThreshold is configured on an item, quantity must be > threshold.
 * - If no threshold is configured, quantity must be >= fallbackMinQty.
 */
export async function getTopInventoryAwareItems(
  outletId,
  { limit = 10, fallbackMinQty = 5, now = new Date() } = {},
) {
  const inventoryDocs = await Inventory.find({ outletId, status: { $ne: false } })
    .select("itemId quantity lowStockThreshold status prioritySlots priceSlots availabilitySlots")
    .lean();

  const eligible = [];

  for (const inv of inventoryDocs) {
    const qty = Number(inv?.quantity) || 0;
    if (qty <= 0) continue;

    const { isAvailable } = resolveSchedule(inv, now);
    if (isAvailable === false) continue;

    const hasThreshold = Number.isFinite(inv?.lowStockThreshold);
    const threshold = hasThreshold ? Number(inv.lowStockThreshold) : Number(fallbackMinQty);

    if (qty <= threshold) continue;

    eligible.push({
      itemId: inv.itemId.toString(),
      count: qty,
    });
  }

  return eligible
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(1, Number(limit) || 10));
}
