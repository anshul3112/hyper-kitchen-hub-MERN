import { getRecommendedItems } from "../services/recommendationService.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * GET /api/v1/kiosks/recommendations
 * Returns recommended items for the kiosk's outlet based on the active time slot.
 * Requires verifyKioskJWT — uses req.kiosk.
 *
 * Response: [{ itemId, priority }] sorted by priority descending.
 * Returns [] when no active slot exists or all items are filtered out.
 */
export const getKioskRecommendations = asyncHandler(async (req, res) => {
  const outletId = req.kiosk.outlet.outletId;

  const recommendations = await getRecommendedItems(outletId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, recommendations, "Recommendations fetched successfully")
    );
});
