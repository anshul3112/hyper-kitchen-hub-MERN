import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../models/userModel.js";
import mongoose from "mongoose";

// ── Cursor helpers for user pagination (sort: _id desc) ──────────────────────
function encodeUserCursor(id) {
  return Buffer.from(id.toString()).toString("base64url");
}

function decodeUserCursor(str) {
  try {
    return new mongoose.Types.ObjectId(Buffer.from(str, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/users/all
 * Cursor-based list of all users. Filters: role, tenantId, search (name/email).
 * Query: cursor, prevCursor, perPage (default 10), role, tenantId, search
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { role: requesterRole } = req.user;
  const isSuperAdmin = requesterRole === "superAdmin";
  const isTenantScopedRequester = ["tenantAdmin", "tenantOwner"].includes(requesterRole);
  if (!isSuperAdmin && !isTenantScopedRequester) throw new ApiError(403, "Forbidden");

  const { cursor, prevCursor, perPage = 10, role, tenantId, search } = req.query;
  const limit = Math.min(Number(perPage), 100);
  const isNext = !!cursor;
  const isPrev = !!prevCursor;

  const baseMatch = {};
  if (role) baseMatch.role = role;
  if (isSuperAdmin) {
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      baseMatch["tenant.tenantId"] = new mongoose.Types.ObjectId(tenantId);
    }
  } else {
    const requesterTenantId = req.user.tenant?.tenantId;
    if (!requesterTenantId || !mongoose.Types.ObjectId.isValid(requesterTenantId)) {
      throw new ApiError(400, "Tenant not found on user");
    }
    baseMatch["tenant.tenantId"] = new mongoose.Types.ObjectId(requesterTenantId);
  }
  if (search) {
    baseMatch.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Cursor filter (sort: _id desc)
  let cursorFilter = {};
  if (isNext) {
    const id = decodeUserCursor(cursor);
    if (id) cursorFilter = { _id: { $lt: id } };
  } else if (isPrev) {
    const id = decodeUserCursor(prevCursor);
    if (id) cursorFilter = { _id: { $gt: id } };
  }

  const sortOrder = isPrev ? 1 : -1; // ascending for prev, then reverse

  const [users, total] = await Promise.all([
    User.find({ ...baseMatch, ...cursorFilter })
      .select("name email role status phoneNumber tenant outlet createdAt")
      .sort({ _id: sortOrder })
      .limit(limit + 1)
      .lean(),
    User.countDocuments(baseMatch),
  ]);

  let result = users;
  const hasMore = result.length > limit;
  if (hasMore) result = result.slice(0, limit);
  if (isPrev) result.reverse();

  const nextCursor = (hasMore || isPrev) && result.length > 0
    ? encodeUserCursor(result[result.length - 1]._id) : null;
  const newPrevCursor = (isNext || (isPrev && hasMore)) && result.length > 0
    ? encodeUserCursor(result[0]._id) : null;

  return res.status(200).json(
    new ApiResponse(200, {
      users: result,
      pagination: {
        nextCursor,
        prevCursor: newPrevCursor,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: !!(hasMore || isPrev),
        hasPrevPage: !!(isNext || (isPrev && hasMore)),
      },
    }, "Users fetched")
  );
});

/**
 * PATCH /api/v1/users/:userId/toggle-status
 * Enable or disable a user. SuperAdmins cannot be modified.
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { role: requesterRole, _id: requesterId } = req.user;
  const isSuperAdmin = requesterRole === "superAdmin";
  const isTenantScopedRequester = ["tenantAdmin", "tenantOwner"].includes(requesterRole);
  if (!isSuperAdmin && !isTenantScopedRequester) throw new ApiError(403, "Forbidden");

  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw new ApiError(400, "Invalid user ID");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (String(user._id) === String(requesterId)) {
    throw new ApiError(403, "You cannot modify your own account status");
  }

  if (user.role === "superAdmin")
    throw new ApiError(403, "Cannot modify a superAdmin account");

  if (isTenantScopedRequester) {
    const requesterTenantId = req.user.tenant?.tenantId;
    if (!requesterTenantId || !mongoose.Types.ObjectId.isValid(requesterTenantId)) {
      throw new ApiError(400, "Tenant not found on user");
    }
    if (String(user.tenant?.tenantId) !== String(requesterTenantId)) {
      throw new ApiError(403, "Cannot modify users from another tenant");
    }
  }

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
