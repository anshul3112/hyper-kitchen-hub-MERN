import { RecommendationSlot } from "../models/recommendationModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * DELETE /api/v1/kiosks/admin/recommendations/:id
 * Delete a recommendation slot. Only the owning outlet admin may delete.
 */
export const deleteRecommendationSlot = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can manage recommendations");
  }

  const outletId = user.outlet?.outletId;
  if (!outletId) throw new ApiError(400, "Outlet information not found in user data");

  const slot = await RecommendationSlot.findById(req.params.id);
  if (!slot) throw new ApiError(404, "Recommendation slot not found");

  if (slot.outletId.toString() !== outletId.toString()) {
    throw new ApiError(403, "You do not have permission to delete this slot");
  }

  await RecommendationSlot.findByIdAndDelete(req.params.id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Recommendation slot deleted successfully"));
});
