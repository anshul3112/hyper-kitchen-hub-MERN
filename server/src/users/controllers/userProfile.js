import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * GET /api/v1/users/profile
 * Returns the logged-in user's profile (no password).
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json(new ApiResponse(200, user, "Profile fetched successfully"));
});

/**
 * PATCH /api/v1/users/profile/change-password
 * Body: { currentPassword, newPassword }
 * Allows the logged-in user to change their own password.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "currentPassword and newPassword are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  // Fetch with password field included
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const isValid = await user.isPasswordCorrect(currentPassword);
  if (!isValid) throw new ApiError(401, "Current password is incorrect");

  user.password = newPassword;
  await user.save(); // triggers bcrypt pre-save hook

  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

/**
 * PATCH /api/v1/users/profile/update
 * Body: { name?, email?, phoneNumber? }
 * Allows the logged-in user to update their own basic details.
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber } = req.body;

  if (!name && !email && !phoneNumber) {
    throw new ApiError(400, "Provide at least one field to update");
  }

  const update = {};
  if (name?.trim()) update.name = name.trim();
  if (email?.trim()) update.email = email.trim().toLowerCase();
  if (phoneNumber?.trim()) update.phoneNumber = phoneNumber.trim();

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: update },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
});
