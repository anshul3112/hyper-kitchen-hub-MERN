import jwt from "jsonwebtoken";
import { OrderDisplay } from "../../outlet/display/models/displayModel.js";
import { Outlet } from "../../outlet/core/models/outletModel.js";
import { Tenant } from "../../tenant/models/tenantModel.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Verifies the Display JWT (issued by loginDisplay) and attaches req.display.
 * Use this on every route a display screen device calls.
 */
const verifyDisplayJWT = async (req, _, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized: missing display token");
    }

    let decoded;

    const secret = process.env.KIOSK_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
    decoded = jwt.verify(token, secret);


    if (decoded.role !== "Display") {
      throw new ApiError(403, "Forbidden: not a display token");
    }

    const display = await OrderDisplay.findById(decoded._id);
    if (!display) {
      throw new ApiError(401, "Display device not found");
    }
    if (display.isActive !== true) {
      throw new ApiError(403, "This display device is disabled");
    }

    const outletId = display.outlet?.outletId;
    if (!outletId) {
      throw new ApiError(403, "Display outlet assignment missing");
    }

    const outlet = await Outlet.findById(outletId).select("status tenant.tenantId");
    if (!outlet) {
      throw new ApiError(403, "Assigned outlet not found");
    }
    if (outlet.status !== true) {
      throw new ApiError(403, "Outlet is disabled");
    }

    const tenantId = display.tenant?.tenantId || outlet.tenant?.tenantId;
    if (!tenantId) {
      throw new ApiError(403, "Display tenant assignment missing");
    }

    const tenant = await Tenant.findById(tenantId).select("status");
    if (!tenant) {
      throw new ApiError(403, "Assigned tenant not found");
    }
    if (tenant.status !== true) {
      throw new ApiError(403, "Tenant is disabled");
    }

    req.display = display;
    next();

  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, "Invalid or expired display token");
  }
};

export { verifyDisplayJWT };
