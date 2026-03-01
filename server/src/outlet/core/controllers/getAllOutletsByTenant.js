import { Outlet } from "../models/outletModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * GET /api/v1/outlets
 * List all outlets belonging to the calling tenantAdmin's tenant.
 */
export const getAllOutletsByTenant = asyncHandler(async (req, res) => {
  const user = req.user;
  
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenantAdmins can view outlets");
  }


  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID not found in user data");
  }

  const outlets = await Outlet.find({
    "tenant.tenantId": tenantId
  }).sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, outlets, "Outlets fetched successfully")
  );
});
