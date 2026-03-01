import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * POST /api/v1/users/forgot-password
 * Body: { email, phoneNumber, newPassword }
 *
 * Identity is verified by matching both email AND registered phone number.
 * No email service is required — suitable for internal-use dashboards.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phoneNumber, newPassword } = req.body;

  if (!email || !phoneNumber || !newPassword) {
    throw new ApiError(
      400,
      "email, phoneNumber, and newPassword are all required"
    );
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  // Both email and phoneNumber must match to prevent guessing
  const user = await User.findOne({ email, phoneNumber });
  if (!user) {
    // Generic message to avoid user enumeration
    throw new ApiError(
      400,
      "No account found matching the provided email and phone number"
    );
  }

  user.password = newPassword;
  await user.save(); // triggers bcrypt pre-save hook

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully. You may now log in."));
});
