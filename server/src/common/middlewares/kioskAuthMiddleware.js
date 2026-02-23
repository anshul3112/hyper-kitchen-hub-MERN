import jwt from "jsonwebtoken";
import { Kiosk } from "../../outlet/kiosk/models/kioskModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * Verifies the kiosk JWT (issued by loginKiosk) and attaches req.kiosk.
 * Use this on every route the kiosk device calls.
 */
const verifyKioskJWT = asyncHandler(async (req, _, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: missing kiosk token");
  }

  let decoded;
  try {
    const secret = process.env.KIOSK_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
    decoded = jwt.verify(token, secret);
  } catch {
    throw new ApiError(401, "Invalid or expired kiosk token");
  }

  if (decoded.role !== "Kiosk") {
    throw new ApiError(403, "Forbidden: not a kiosk token");
  }

  const kiosk = await Kiosk.findById(decoded._id);

  if (!kiosk) {
    throw new ApiError(401, "Kiosk not found");
  }

  if (!kiosk.isActive) {
    throw new ApiError(403, "This kiosk is disabled");
  }

  req.kiosk = kiosk;
  next();
});

export { verifyKioskJWT };
