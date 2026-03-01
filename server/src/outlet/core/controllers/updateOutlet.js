import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Outlet } from "../models/outletModel.js";
import mongoose from "mongoose";

/**
 * PATCH /api/v1/outlets/:outletId/update
 * Body: { name?, address?, contacts?: { email?, phoneNumber? } }
 * Allowed roles: outletAdmin, outletOwner (must belong to that outlet), tenantAdmin/tenantOwner (of the same tenant), superAdmin.
 */
export const updateOutletDetails = asyncHandler(async (req, res) => {
  const { outletId } = req.params;
  const { role } = req.user;

  if (!mongoose.Types.ObjectId.isValid(outletId))
    throw new ApiError(400, "Invalid outlet ID");

  // Authorisation
  if (role !== "superAdmin") {
    if (!["outletAdmin", "outletOwner", "tenantAdmin", "tenantOwner"].includes(role))
      throw new ApiError(403, "Forbidden");

    // outlet-level roles must belong to this outlet
    if (["outletAdmin", "outletOwner"].includes(role)) {
      const userOutletId = req.user.outlet?.outletId?.toString();
      if (userOutletId !== outletId)
        throw new ApiError(403, "You can only update your own outlet");
    }
    // tenantAdmin/tenantOwner: check the outlet belongs to their tenant
    if (["tenantAdmin", "tenantOwner"].includes(role)) {
      const outlet = await Outlet.findById(outletId).select("tenant");
      if (!outlet) throw new ApiError(404, "Outlet not found");
      const outletTenantId = outlet.tenant?.tenantId?.toString();
      const userTenantId = req.user.tenant?.tenantId?.toString();
      if (outletTenantId !== userTenantId)
        throw new ApiError(403, "This outlet does not belong to your tenant");
    }
  }

  const { name, address, contacts } = req.body;

  if (!name && !address && !contacts?.email && !contacts?.phoneNumber)
    throw new ApiError(400, "Provide at least one field to update");

  const update = {};
  if (name?.trim()) update.name = name.trim();
  if (address?.trim()) update.address = address.trim();
  if (contacts?.email?.trim()) update["contacts.email"] = contacts.email.trim().toLowerCase();
  if (contacts?.phoneNumber?.trim()) update["contacts.phoneNumber"] = contacts.phoneNumber.trim();

  const outlet = await Outlet.findByIdAndUpdate(
    outletId,
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!outlet) throw new ApiError(404, "Outlet not found");

  res.status(200).json(new ApiResponse(200, outlet, "Outlet updated successfully"));
});
