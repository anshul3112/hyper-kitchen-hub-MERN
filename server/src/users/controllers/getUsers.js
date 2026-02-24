import { User } from "../models/userModel.js"
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getSuperAdmins = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "superAdmin") {
        throw new ApiError(403, "Only superAdmins can view super admins");
    }
    try {
        const superAdmins = await User.find({ role: "superAdmin" }).select("-password").sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, superAdmins, "Super Admins fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to fetch super admins");
    }
});

export const getTenantAdmins = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "tenantAdmin") {
        throw new ApiError(403, "Only superAdmins can view tenant admins");
    }

    const tenantId = user.tenant.tenantId;

    try {
        const tenantAdmins = await User.find({ role: "tenantAdmin", "tenant.tenantId": tenantId }).select("-password").sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, tenantAdmins, "Tenant Admins fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to fetch tenant admins");
    }
});

export const getOutletAdmins = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "tenantAdmin") {
        throw new ApiError(403, "Only tenantAdmins can view outlet admins");
    }
    const tenantId = user.tenant.tenantId;
    try {
        const outletAdmins = await User.find({ role: "outletAdmin", "tenant.tenantId": tenantId }).select("-password").sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, outletAdmins, "Outlet Admins fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to fetch outlet admins");
    }   
});

/**
 * GET /api/v1/users/outlet-staff
 * OutletAdmin fetches all kitchenStaff + billingStaff for their outlet.
 */
export const getOutletStaff = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "outletAdmin") {
        throw new ApiError(403, "Only outletAdmins can view outlet staff");
    }
    const outletId = user.outlet?.outletId;
    if (!outletId) {
        throw new ApiError(403, "No outlet associated with this user");
    }
    try {
        const staff = await User
            .find({ role: { $in: ["kitchenStaff", "billingStaff"] }, "outlet.outletId": outletId })
            .select("-password")
            .sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, staff, "Outlet staff fetched successfully"));
    } catch (error) {
        throw new ApiError(500, "Failed to fetch outlet staff");
    }
});

