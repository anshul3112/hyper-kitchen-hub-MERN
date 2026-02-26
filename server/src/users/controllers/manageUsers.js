import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../models/userModel.js";
import mongoose from "mongoose"; 

/**
 * GET /api/v1/users/all
 * Paginated list of all users. Filters: role, tenantId, search (name/email).
 */
const getAllUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "superAdmin") throw new ApiError(403, "Forbidden");

  const { page = 1, limit = 20, role, tenantId, search } = req.query;

  const matchStage = {};
  if (role) matchStage.role = role;
  if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
    matchStage["tenant.tenantId"] = new mongoose.Types.ObjectId(tenantId);
  }
  if (search) {
    matchStage.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(matchStage)
      .select("name email role status phoneNumber tenant outlet createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(matchStage),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      "Users fetched"
    )
  );
});

/**
 * PATCH /api/v1/users/:userId/toggle-status
 * Enable or disable a user. SuperAdmins cannot be modified.
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== "superAdmin") throw new ApiError(403, "Forbidden");

  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new ApiError(400, "Invalid user ID");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "superAdmin")
    throw new ApiError(403, "Cannot modify a superAdmin account");

  user.status = !user.status;
  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: { _id: user._id, name: user.name, status: user.status } },
      `User ${user.status ? "enabled" : "disabled"} successfully`
    )
  );
});

export { getAllUsers, toggleUserStatus };
