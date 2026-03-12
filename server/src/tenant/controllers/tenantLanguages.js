import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Tenant } from "../models/tenantModel.js";
import { SUPPORTED_LANGUAGES } from "../../utils/constants.js";
import mongoose from "mongoose";

/**
 * GET /api/v1/tenants/:tenantId/languages
 * Returns the kiosk languages configured for the tenant.
 * Allowed: tenantAdmin, tenantOwner (own tenant only), superAdmin.
 */
export const getTenantLanguages = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { role } = req.user;

  if (!mongoose.Types.ObjectId.isValid(tenantId))
    throw new ApiError(400, "Invalid tenant ID");

  if (role !== "superAdmin") {
    if (!["tenantAdmin", "tenantOwner"].includes(role))
      throw new ApiError(403, "Forbidden");
    if (req.user.tenant?.tenantId?.toString() !== tenantId)
      throw new ApiError(403, "You can only view your own tenant");
  }

  const tenant = await Tenant.findById(tenantId).select("kioskLanguages").lean();
  if (!tenant) throw new ApiError(404, "Tenant not found");

  res.status(200).json(
    new ApiResponse(200, { kioskLanguages: tenant.kioskLanguages ?? [] }, "Languages fetched")
  );
});

/**
 * PATCH /api/v1/tenants/:tenantId/languages
 * Body: { kioskLanguages: string[] }
 * Sets the additional kiosk languages for the tenant (English is always implicit).
 * Allowed: tenantAdmin, tenantOwner (own tenant only), superAdmin.
 */
export const updateTenantLanguages = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { role } = req.user;

  if (!mongoose.Types.ObjectId.isValid(tenantId))
    throw new ApiError(400, "Invalid tenant ID");

  if (role !== "superAdmin") {
    if (!["tenantAdmin", "tenantOwner"].includes(role))
      throw new ApiError(403, "Forbidden");
    if (req.user.tenant?.tenantId?.toString() !== tenantId)
      throw new ApiError(403, "You can only update your own tenant");
  }

  const { kioskLanguages } = req.body;
  if (!Array.isArray(kioskLanguages))
    throw new ApiError(400, "kioskLanguages must be an array");

  // Deduplicate and validate: no English, must be in SUPPORTED_LANGUAGES
  const unique = [...new Set(kioskLanguages)];
  const invalid = unique.filter(
    (lang) => lang === "English" || !SUPPORTED_LANGUAGES.includes(lang)
  );
  if (invalid.length > 0)
    throw new ApiError(400, `Invalid or unsupported languages: ${invalid.join(", ")}`);

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { kioskLanguages: unique } },
    { new: true, runValidators: true }
  ).select("kioskLanguages");

  if (!tenant) throw new ApiError(404, "Tenant not found");

  res.status(200).json(
    new ApiResponse(200, { kioskLanguages: tenant.kioskLanguages }, "Languages updated")
  );
});
