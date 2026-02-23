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
    const existing = await Kiosk.findOne({
      loginCode: code,
      loginCodeExpiresAt: { $gt: new Date() },
    });
    if (!existing) exists = false;
  }
  return code;
};

// Toggle kiosk active/disabled state
// PATCH /api/v1/kiosks/:id/toggle
export const toggleKiosk = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can toggle kiosks");
  }

  const { id } = req.params;
  const kiosk = await Kiosk.findById(id);

  if (!kiosk) throw new ApiError(404, "Kiosk not found");

  if (String(kiosk.outlet.outletId) !== String(user.outlet?.outletId)) {
    throw new ApiError(403, "Not authorized to modify this kiosk");
  }

  if (kiosk.isActive) {
    // ── Disable ──────────────────────────────────────────────────────────────
    kiosk.isActive = false;
    kiosk.status = "DISABLED";
    kiosk.loginCode = null;
    kiosk.loginCodeExpiresAt = null;
  } else {
    // ── Enable: generate a fresh 6-digit code valid for 1 minute ─────────────
    const loginCode = await generateLoginCode();
    kiosk.isActive = true;
    kiosk.status = "ACTIVE";
    kiosk.loginCode = loginCode;
    kiosk.code = loginCode;
    kiosk.loginCodeExpiresAt = new Date(Date.now() + 60 * 1000);
  }

  await kiosk.save();

  const message = kiosk.isActive
    ? "Kiosk enabled. Use the loginCode to log in (valid for 1 minute)."
    : "Kiosk disabled.";

  return res.status(200).json(new ApiResponse(200, kiosk.toObject(), message));
});
