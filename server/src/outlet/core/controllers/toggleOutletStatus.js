import { Outlet } from "../models/outletModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// PATCH /api/v1/outlets/:outletId/toggle
// Flips the status (active ↔ inactive) of an outlet.
// Only the tenantAdmin who owns the outlet can do this.
export const toggleOutletStatus = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can change outlet status");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant information not found in user data");
  }

  const { outletId } = req.params;

  // Find the outlet and verify it belongs to this tenant
  const outlet = await Outlet.findOne({
    _id: outletId,
    "tenant.tenantId": tenantId,
  });

  if (!outlet) {
    throw new ApiError(404, "Outlet not found or does not belong to your tenant");
  }

  outlet.status = !outlet.status;
  await outlet.save();

  const msg = outlet.status ? "Outlet enabled successfully" : "Outlet disabled successfully";

  return res.status(200).json(new ApiResponse(200, outlet, msg));
});
