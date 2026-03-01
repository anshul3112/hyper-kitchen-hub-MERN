import mongoose from "mongoose";
import { Outlet } from "../models/outletModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * GET /api/v1/outlets/:outletId
 * Returns a single outlet's details.
 * Allowed: outletAdmin/Owner (own outlet), tenantAdmin/Owner (own tenant's outlet), superAdmin (any)
 */
export const getOutletById = asyncHandler(async (req, res) => {
  const { outletId } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(outletId))
    throw new ApiError(400, "Invalid outlet ID");

  const outlet = await Outlet.findById(outletId).lean();
  if (!outlet) throw new ApiError(404, "Outlet not found");

  // Authorization
  if (user.role === "superAdmin") {
    // allowed
  } else if (["tenantAdmin", "tenantOwner"].includes(user.role)) {
    if (outlet.tenant.tenantId.toString() !== user.tenant?.tenantId?.toString())
      throw new ApiError(403, "Forbidden");
  } else if (["outletAdmin", "outletOwner"].includes(user.role)) {
    if (outlet._id.toString() !== user.outlet?.outletId?.toString())
      throw new ApiError(403, "Forbidden");
  } else {
    throw new ApiError(403, "Forbidden");
  }

  return res.status(200).json(
    new ApiResponse(200, { outlet }, "Outlet fetched successfully")
  );
});
