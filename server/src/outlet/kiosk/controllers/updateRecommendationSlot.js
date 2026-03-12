import { RecommendationSlot } from "../models/recommendationModel.js";
import { Items } from "../../../items/models/itemModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * PUT /api/v1/kiosks/admin/recommendations/:id
 * Update a recommendation slot. Only the owning outlet admin may update.
 */
export const updateRecommendationSlot = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can manage recommendations");
  }

  const outletId = user.outlet?.outletId;
  const tenantId = user.tenant?.tenantId;
  if (!outletId) throw new ApiError(400, "Outlet information not found in user data");
  if (!tenantId) throw new ApiError(400, "Tenant information not found in user data");

  const slot = await RecommendationSlot.findById(req.params.id);
  if (!slot) throw new ApiError(404, "Recommendation slot not found");

  if (slot.outletId.toString() !== outletId.toString()) {
    throw new ApiError(403, "You do not have permission to update this slot");
  }

  const { name, startTime, endTime, isActive, items } = req.body;

  if (startTime !== undefined || endTime !== undefined) {
    const st = startTime !== undefined ? startTime : slot.startTime;
    const et = endTime !== undefined ? endTime : slot.endTime;
    if (st < 0 || st > 1439 || et < 0 || et > 1439) {
      throw new ApiError(400, "startTime and endTime must be between 0 and 1439 (minutes of day)");
    }
  }

  const slotItems = items !== undefined ? items : undefined;

  if (slotItems !== undefined) {
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
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (startTime !== undefined) updateData.startTime = startTime;
  if (endTime !== undefined) updateData.endTime = endTime;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (slotItems !== undefined) updateData.items = slotItems;

  const updated = await RecommendationSlot.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Recommendation slot updated successfully"));
});
