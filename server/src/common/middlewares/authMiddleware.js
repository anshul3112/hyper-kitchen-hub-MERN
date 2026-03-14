import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../users/models/userModel.js";
import { Tenant } from "../../tenant/models/tenantModel.js";
import { Outlet } from "../../outlet/core/models/outletModel.js";

const TENANT_LEVEL_ROLES = new Set(["tenantAdmin", "tenantOwner"]);
const OUTLET_LEVEL_ROLES = new Set([
  "outletAdmin",
  "outletOwner",
  "kitchenStaff",
  "billingStaff",
]);

const verifyJWT = async (req, _, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request, missing token");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select("-password");
    if (!user) {
      throw new ApiError(401, "Invalid token access");
    }

    if (user.status !== true) {
      throw new ApiError(403, "User account is disabled");
    }

    if (TENANT_LEVEL_ROLES.has(user.role) || OUTLET_LEVEL_ROLES.has(user.role)) {
      const tenantId = user.tenant?.tenantId;
      if (!tenantId) {
        throw new ApiError(403, "Tenant assignment missing for this user");
      }

      const tenant = await Tenant.findById(tenantId).select("status");
      if (!tenant) {
        throw new ApiError(403, "Assigned tenant not found");
      }
      if (tenant.status !== true) {
        throw new ApiError(403, "Tenant is disabled");
      }
    }

    if (OUTLET_LEVEL_ROLES.has(user.role)) {
      const outletId = user.outlet?.outletId;
      if (!outletId) {
        throw new ApiError(403, "Outlet assignment missing for this user");
      }

      const outlet = await Outlet.findById(outletId).select("status");
      if (!outlet) {
        throw new ApiError(403, "Assigned outlet not found");
      }
      if (outlet.status !== true) {
        throw new ApiError(403, "Outlet is disabled");
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, "Invalid or expired access token");
  }
};

export { verifyJWT };
