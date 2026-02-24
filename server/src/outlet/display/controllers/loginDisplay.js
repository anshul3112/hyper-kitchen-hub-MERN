import jwt from "jsonwebtoken";
import { OrderDisplay } from "../models/displayModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * POST /api/v1/displays/login
 * Public — called by the display screen device.
 * Body: { loginCode }
 * Returns a long-lived JWT and the display's outlet context.
 */
export const loginDisplay = asyncHandler(async (req, res) => {
  const { loginCode } = req.body;

  if (!loginCode) {
    throw new ApiError(400, "loginCode is required");
  }

  const display = await OrderDisplay.findOne({
    loginCode: String(loginCode),
    loginCodeExpiresAt: { $gt: new Date() },
    isActive: true,
  });

  if (!display) {
    throw new ApiError(401, "Invalid or expired login code");
  }

  const secret = process.env.KIOSK_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  const expiresIn = process.env.KIOSK_TOKEN_EXPIRY || "30d";

  // Include outlet in token payload so socket.js can gate the join:outlet room
  const token = jwt.sign(
    {
      _id: display._id,
      role: "Display",
      outlet: display.outlet,
    },
    secret,
    { expiresIn }
  );

  // Consume one-time code
  display.loginCode = null;
  display.loginCodeExpiresAt = null;
  display.lastLoginAt = new Date();
  await display.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        display: {
          _id: display._id,
          number: display.number,
          outlet: display.outlet,
          tenant: display.tenant,
        },
      },
      "Display device logged in successfully"
    )
  );
});
