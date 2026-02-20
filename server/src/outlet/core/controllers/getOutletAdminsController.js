import mongoose from "mongoose";
import { User } from "../../../users/models/userModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

export const getOutletAdminsByOutlet = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenantAdmins can view outlet admins");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID not found in user data");
  }

  const { outletId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(outletId)) {
    throw new ApiError(400, "Invalid outlet ID");
  }

  const outletAdmins = await User.find({
    role: "outletAdmin",
    "outlet.outletId": outletId,
    "tenant.tenantId": tenantId
  }).select("-password -__v");

  return res.status(200).json(
    new ApiResponse(200, outletAdmins, "Outlet admins fetched successfully")
  );
});
