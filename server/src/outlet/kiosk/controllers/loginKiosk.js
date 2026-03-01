import jwt from "jsonwebtoken";
import { Kiosk } from "../models/kioskModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * POST /api/v1/kiosks/login
 * Authenticate a kiosk device by its 6-digit login code and return a kiosk JWT.
 */
export const loginKiosk = asyncHandler(async (req, res) => {
  const { loginCode } = req.body;

  if (!loginCode) {
    throw new ApiError(400, "loginCode is required");
  }

  // Find any kiosk with this active, non-expired code
  const kiosk = await Kiosk.findOne({
    loginCode: String(loginCode),
    loginCodeExpiresAt: { $gt: new Date() },
    isActive: true,
  });

  if (!kiosk) {
    throw new ApiError(401, "Invalid or expired login code");
  }

  // Issue a long-lived kiosk JWT (30 days — kiosk sessions are persistent)
  const secret = process.env.KIOSK_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  const expiresIn = process.env.KIOSK_TOKEN_EXPIRY || "30d";
  const token = jwt.sign(
    {
      _id: kiosk._id,
      role: "Kiosk"
    },
    secret,
    { expiresIn: expiresIn }
  );

  // Consume the one-time code and record login time
  kiosk.loginCode = null;
  kiosk.loginCodeExpiresAt = null;
  kiosk.lastLoginAt = new Date();
  await kiosk.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        kiosk: {
          _id: kiosk._id,
          number: kiosk.number,
          status: kiosk.status,
          outlet: kiosk.outlet,
          tenant: kiosk.tenant,
        },
      },
      "Kiosk logged in successfully"
    )
  );
});
