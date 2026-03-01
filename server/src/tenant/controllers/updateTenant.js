import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Tenant } from "../models/tenantModel.js";
import mongoose from "mongoose";

/**
 * PATCH /api/v1/tenants/:tenantId/update
 * Body: { name?, address?, contacts?: { email?, phoneNumber? } }
 * Allowed roles: tenantAdmin, tenantOwner (must belong to that tenant), superAdmin.
 */
export const updateTenantDetails = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { role } = req.user;

  if (!mongoose.Types.ObjectId.isValid(tenantId))
    throw new ApiError(400, "Invalid tenant ID");

  // Authorisation: superAdmin can edit any tenant; tenant roles can only edit their own
  if (role !== "superAdmin") {
    if (!["tenantAdmin", "tenantOwner"].includes(role))
      throw new ApiError(403, "Forbidden");

    const userTenantId = req.user.tenant?.tenantId?.toString();
    if (userTenantId !== tenantId)
      throw new ApiError(403, "You can only update your own tenant");
  }

  const { name, address, contacts } = req.body;

  if (!name && !address && !contacts?.email && !contacts?.phoneNumber)
    throw new ApiError(400, "Provide at least one field to update");

  const update = {};
  if (name?.trim()) update.name = name.trim();
  if (address?.trim()) update.address = address.trim();
  if (contacts?.email?.trim()) update["contacts.email"] = contacts.email.trim().toLowerCase();
  if (contacts?.phoneNumber?.trim()) update["contacts.phoneNumber"] = contacts.phoneNumber.trim();

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!tenant) throw new ApiError(404, "Tenant not found");

  res.status(200).json(new ApiResponse(200, tenant, "Tenant updated successfully"));
});
