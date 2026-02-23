import { Kiosk } from "../models/kioskModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// Generate a unique 6-digit numeric login code
const generateLoginCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const existingKiosk = await Kiosk.findOne({ loginCode: code, loginCodeExpiresAt: { $gt: new Date() } });
    if (!existingKiosk) exists = false;
  }

  return code;
};

// Create new kiosk
export const createKiosk = asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if user is outletAdmin
  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can create kiosks");
  }

  // Get outlet and tenant from user
  const outletId = user.outlet?.outletId;
  const outletName = user.outlet?.outletName;
  const tenantId = user.tenant?.tenantId;
  const tenantName = user.tenant?.tenantName;

  if (!outletId || !outletName) {
    throw new ApiError(400, "Outlet information not found in user data");
  }

  if (!tenantId || !tenantName) {
    throw new ApiError(400, "Tenant information not found in user data");
  }

  // Auto-increment: find the highest kiosk number in this outlet and add 1
  const lastKiosk = await Kiosk.findOne({ "outlet.outletId": outletId }).sort({ number: -1 }).select("number");
  const number = lastKiosk ? lastKiosk.number + 1 : 1;

  // Generate 6-digit login code valid for 1 minute
  const loginCode = await generateLoginCode();
  const loginCodeExpiresAt = new Date(Date.now() + 60 * 1000);

  // Create kiosk
  const kiosk = new Kiosk({
    code: loginCode,   // keep `code` field populated (used elsewhere)
    number,
    loginCode,
    loginCodeExpiresAt,
    status: "ACTIVE",
    isActive: true,
    outlet: {
      outletId,
      outletName
    },
    tenant: {
      tenantId,
      tenantName
    },
    role: "Kiosk"
  });

  await kiosk.save();

  // Return response with the temporary login code and its expiry
  return res.status(201).json(
    new ApiResponse(201, {
      ...kiosk.toObject()
    }, "Kiosk created successfully. Use the loginCode to access the kiosk.")
  );
});
