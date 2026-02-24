import { OrderDisplay } from "../models/displayModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

const generateLoginCode = async () => {
  let code;
  let exists = true;
  while (exists) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await OrderDisplay.findOne({
      loginCode: code,
      loginCodeExpiresAt: { $gt: new Date() },
    });
    if (!existing) exists = false;
  }
  return code;
};

/**
 * POST /api/v1/displays/create
 * Only outletAdmins can create display screen devices.
 */
export const createDisplay = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can create display devices");
  }

  const outletId = user.outlet?.outletId;
  const outletName = user.outlet?.outletName;
  const tenantId = user.tenant?.tenantId;
  const tenantName = user.tenant?.tenantName;

  if (!outletId || !outletName) throw new ApiError(400, "Outlet info missing from user");
  if (!tenantId || !tenantName) throw new ApiError(400, "Tenant info missing from user");

  // Auto-increment display number per outlet
  const last = await OrderDisplay.findOne({ "outlet.outletId": outletId })
    .sort({ number: -1 })
    .select("number");
  const number = last ? last.number + 1 : 1;

  const loginCode = await generateLoginCode();
  const loginCodeExpiresAt = new Date(Date.now() + 60 * 1000); // 1 minute

  const display = new OrderDisplay({
    number,
    isActive: true,
    outlet: { outletId, outletName },
    tenant: { tenantId, tenantName },
    loginCode,
    loginCodeExpiresAt,
    role: "Display",
  });

  await display.save();

  return res
    .status(201)
    .json(new ApiResponse(201, display.toObject(), "Display device created. Use loginCode to activate."));
});

/**
 * GET /api/v1/displays
 * List all display devices for the calling outletAdmin's outlet.
 */
export const getAllDisplays = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can list display devices");
  }

  const outletId = user.outlet?.outletId;
  if (!outletId) throw new ApiError(403, "No outlet on this user");

  const displays = await OrderDisplay.find({ "outlet.outletId": outletId }).sort({ number: 1 });
  return res.status(200).json(new ApiResponse(200, displays, "Displays fetched"));
});
