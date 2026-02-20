import { Kiosk } from "../models/kioskModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// Generate random unique kiosk code
const generateKioskCode = async () => {
  let code;
  let exists = true;
  
  while (exists) {
    // Generate random 8-character alphanumeric code
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Check if code already exists
    const existingKiosk = await Kiosk.findOne({ code });
    if (!existingKiosk) {
      exists = false;
    }
  }
  
  return code;
};

// Create new kiosk
export const createKiosk = asyncHandler(async (req, res) => {
  const { number } = req.body;
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

  // Validate kiosk number
  if (!number || number < 1) {
    throw new ApiError(400, "Valid kiosk number is required");
  }

  // Check if kiosk with this number already exists in this outlet
  const existingKiosk = await Kiosk.findOne({
    "outlet.outletId": outletId,
    number
  });

  if (existingKiosk) {
    throw new ApiError(409, `Kiosk with number ${number} already exists in this outlet`);
  }

  // Generate unique code
  const code = await generateKioskCode();

  // Create kiosk
  const kiosk = new Kiosk({
    code,
    number,
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

  // Return response with code
  return res.status(201).json(
    new ApiResponse(201, {
      ...kiosk.toObject(),
      loginCode: code
    }, "Kiosk created successfully. Use the loginCode to access the kiosk.")
  );
});
