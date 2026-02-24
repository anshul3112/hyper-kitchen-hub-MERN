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
 * PATCH /api/v1/displays/:id/toggle
 * Enable or disable a display device. Enabling generates a fresh 1-minute login code.
 */
export const toggleDisplay = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can toggle display devices");
  }

  const { id } = req.params;
  const display = await OrderDisplay.findById(id);

  if (!display) throw new ApiError(404, "Display device not found");

  if (String(display.outlet.outletId) !== String(user.outlet?.outletId)) {
    throw new ApiError(403, "Not authorized to modify this display device");
  }

  if (display.isActive) {
    // ── Disable ──────────────────────────────────────────────────────────────
    display.isActive = false;
    display.loginCode = null;
    display.loginCodeExpiresAt = null;
  } else {
    // ── Enable: generate a fresh 6-digit code valid for 1 minute ─────────────
    const loginCode = await generateLoginCode();
    display.isActive = true;
    display.loginCode = loginCode;
    display.loginCodeExpiresAt = new Date(Date.now() + 60 * 1000);
  }

  await display.save();

  const message = display.isActive
    ? "Display enabled. Use the loginCode to activate it (valid for 1 minute)."
    : "Display disabled.";

  return res.status(200).json(new ApiResponse(200, display.toObject(), message));
});
