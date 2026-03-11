import { Inventory } from "../../../items/models/inventoryModel.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { resolveSchedule } from "../../utils/resolveSchedule.js";

/**
 * GET /api/v1/kiosks/inventory
 * Returns all inventory records for the kiosk's outlet, enriched with the
 * schedule-resolved active price so the kiosk can always display the correct
 * price without doing any time-math on the client.
 *
 * Added field per record:
 *   activePrice: number | null
 *     — null  → use inventory.price (outlet override) or item.defaultAmount
 *     — number → use this price; it came from the highest-priority matching slot
 *
 * Requires verifyKioskJWT — uses req.kiosk.
 */
export const getKioskInventory = asyncHandler(async (req, res) => {
  const kiosk = req.kiosk;

  if (!kiosk.outlet || !kiosk.outlet.outletId) {
    throw new ApiError(400, "Outlet information not found in kiosk data");
  }

  const outletId = kiosk.outlet.outletId;
  const now = new Date();

  const inventoryRecords = await Inventory.find({ outletId }).lean();

  const enriched = inventoryRecords.map((record) => {
    const { activePrice } = resolveSchedule(record, now);
    return { ...record, activePrice };
  });

  return res.status(200).json(
    new ApiResponse(200, enriched, "Kiosk inventory fetched successfully")
  );
});
