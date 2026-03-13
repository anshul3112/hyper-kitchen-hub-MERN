import { getRecommendedItems } from "../services/recommendationService.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * GET /api/v1/kiosks/recommendations
 * Returns recommended items for the kiosk's outlet based on merged weighted
 * recommendation sources (admin-configured slots + outlet time-slot frequency).
 * Requires verifyKioskJWT — uses req.kiosk.
 *
 * Response: [{ itemId, priority }] sorted by weighted priority descending.
 * Returns [] when no recommendation source yields available items.
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
