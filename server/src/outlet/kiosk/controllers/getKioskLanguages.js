import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Tenant } from "../../../tenant/models/tenantModel.js";

/**
 * GET /api/v1/kiosks/languages
 * Returns the kiosk languages configured for the kiosk's tenant.
 * English is always available (not stored); this returns the additional languages only.
 * Auth: verifyKioskJWT
 */
const getKioskLanguages = asyncHandler(async (req, res) => {
  const tenantId = req.kiosk.tenant.tenantId;

  const tenant = await Tenant.findById(tenantId).select("kioskLanguages").lean();
  if (!tenant) throw new ApiError(404, "Tenant not found");

  return res.status(200).json(
    new ApiResponse(
      200,
      { kioskLanguages: tenant.kioskLanguages ?? [] },
      "Kiosk languages fetched"
    )
  );
});

export { getKioskLanguages };
