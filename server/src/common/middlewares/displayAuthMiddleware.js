import jwt from "jsonwebtoken";
import { OrderDisplay } from "../../outlet/display/models/displayModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * Verifies the Display JWT (issued by loginDisplay) and attaches req.display.
 * Use this on every route a display screen device calls.
 */
const verifyDisplayJWT = asyncHandler(async (req, _, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: missing display token");
  }

  let decoded;
  try {
    const secret = process.env.KIOSK_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
    decoded = jwt.verify(token, secret);
  } catch {
    throw new ApiError(401, "Invalid or expired display token");
  }

  if (decoded.role !== "Display") {
    throw new ApiError(403, "Forbidden: not a display token");
  }

  const display = await OrderDisplay.findById(decoded._id);
  if (!display) {
    throw new ApiError(401, "Display device not found");
  }
  if (!display.isActive) {
    throw new ApiError(403, "This display device is disabled");
  }

  req.display = display;
  next();
});

export { verifyDisplayJWT };
