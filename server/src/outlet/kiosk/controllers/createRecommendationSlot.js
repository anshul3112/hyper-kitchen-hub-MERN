import { RecommendationSlot } from "../models/recommendationModel.js";
import { Items } from "../../../items/models/itemModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * POST /api/v1/kiosks/admin/recommendations
 * Create a recommendation slot for the calling outletAdmin's outlet.
 */
export const createRecommendationSlot = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can manage recommendations");
  }

  const outletId = user.outlet?.outletId;
  const tenantId = user.tenant?.tenantId;

  if (!outletId) throw new ApiError(400, "Outlet information not found in user data");
  if (!tenantId) throw new ApiError(400, "Tenant information not found in user data");

  const { name, startTime, endTime, isActive, items } = req.body;

  if (startTime === undefined || endTime === undefined) {
    throw new ApiError(400, "startTime and endTime are required");
  }
  if (startTime < 0 || startTime > 1439 || endTime < 0 || endTime > 1439) {
    throw new ApiError(400, "startTime and endTime must be between 0 and 1439 (minutes of day)");
  }

  const slotItems = items ?? [];

  if (slotItems.length > 10) {
    throw new ApiError(400, "A recommendation slot can have at most 10 items");
  }

  for (const entry of slotItems) {
    if (!entry.itemId) throw new ApiError(400, "Each item entry must have an itemId");
    if (!entry.priority || entry.priority < 1) {
      throw new ApiError(400, "Each item entry must have a priority >= 1");
    }
  }

  if (slotItems.length > 0) {
    const itemIds = slotItems.map((e) => e.itemId);
    const existingItems = await Items.find({ _id: { $in: itemIds }, tenantId })
      .select("_id")
      .lean();

    if (existingItems.length !== itemIds.length) {
      throw new ApiError(400, "One or more itemIds do not exist for this tenant");
    }
  }

  const slot = await RecommendationSlot.create({
    tenantId,
    outletId,
    name,
    startTime,
    endTime,
    isActive: isActive !== undefined ? isActive : true,
    items: slotItems,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, slot, "Recommendation slot created successfully"));
});
