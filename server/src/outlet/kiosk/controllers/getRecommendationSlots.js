import { RecommendationSlot } from "../models/recommendationModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * GET /api/v1/kiosks/admin/recommendations
 * Returns all recommendation slots for the calling outletAdmin's outlet.
 */
export const getRecommendationSlots = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can view recommendations");
  }

  const outletId = user.outlet?.outletId;
  if (!outletId) throw new ApiError(400, "Outlet information not found in user data");

  const slots = await RecommendationSlot.find({ outletId })
    .sort({ startTime: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, slots, "Recommendation slots fetched successfully"));
});
