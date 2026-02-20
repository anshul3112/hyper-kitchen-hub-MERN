import { Kiosk } from "../models/kioskModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// Get all kiosks for an outlet
export const getAllKiosks = asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if user is outletAdmin
  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can view kiosks");
  }

  // Get outlet from user
  const outletId = user.outlet?.outletId;

  if (!outletId) {
    throw new ApiError(400, "Outlet information not found in user data");
  }

  // Fetch all kiosks for this outlet
  const kiosks = await Kiosk.find({
    "outlet.outletId": outletId
  }).sort({ number: 1 }).select("-__v");

  return res.status(200).json(
    new ApiResponse(200, kiosks, "Kiosks fetched successfully")
  );
});
