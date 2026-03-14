import jwt from "jsonwebtoken";
import { Kiosk } from "../../outlet/kiosk/models/kioskModel.js";
import { Outlet } from "../../outlet/core/models/outletModel.js";
import { Tenant } from "../../tenant/models/tenantModel.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Verifies the kiosk JWT (issued by loginKiosk) and attaches req.kiosk.
 * Use this on every route the kiosk device calls.
 */
const verifyKioskJWT = async (req, _, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized: missing kiosk token");
    }

    let decoded;

    const secret = process.env.KIOSK_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
    decoded = jwt.verify(token, secret);

    if (decoded.role !== "Kiosk") {
      throw new ApiError(403, "Forbidden: not a kiosk token");
    }

    const kiosk = await Kiosk.findById(decoded._id);

    if (!kiosk) {
      throw new ApiError(401, "Kiosk not found");
    }

    if (kiosk.isActive !== true) {
      throw new ApiError(403, "This kiosk is disabled");
    }

    const outletId = kiosk.outlet?.outletId;
    if (!outletId) {
      throw new ApiError(403, "Kiosk outlet assignment missing");
    }

    const outlet = await Outlet.findById(outletId).select("status tenant.tenantId");
    if (!outlet) {
      throw new ApiError(403, "Assigned outlet not found");
    }
    if (outlet.status !== true) {
      throw new ApiError(403, "Outlet is disabled");
    }

    const tenantId = kiosk.tenant?.tenantId || outlet.tenant?.tenantId;
    if (!tenantId) {
      throw new ApiError(403, "Kiosk tenant assignment missing");
    }

    const tenant = await Tenant.findById(tenantId).select("status");
    if (!tenant) {
      throw new ApiError(403, "Assigned tenant not found");
    }
    if (tenant.status !== true) {
      throw new ApiError(403, "Tenant is disabled");
    }

    req.kiosk = kiosk;
    next();

  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, "Invalid or expired kiosk token");
  }
};

export { verifyKioskJWT };
