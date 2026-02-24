import { Inventory } from "../../items/models/inventoryModel.js";
import { ApiError } from "../../utils/ApiError.js";

export async function reserveInventoryStock(items, outletId, session) {
  for (const it of items) {
    const itemId = it.id;
    const qty = it.quantity;
    if (!itemId || qty <= 0) continue;

    const result = await Inventory.updateOne(
      { itemId, outletId, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { session }
    );

    if (result.modifiedCount === 0) {
      throw new ApiError(
        400,
        `Insufficient stock for item "${it.name ?? itemId}"`
      );
    }
  }
}


export async function restoreInventoryStock(items, outletId) {
  await Promise.all(
    items.map((it) => {
      const itemId = it.id;
      const qty = it.quantity;
      if (!itemId || qty <= 0) return Promise.resolve();

      return Inventory.updateOne(
        { itemId, outletId },
        { $inc: { quantity: qty } }
      );
    })
  );
}

