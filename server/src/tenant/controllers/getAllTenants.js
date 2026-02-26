import { Tenant } from "../models/tenantModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getAllTenants = asyncHandler(async (req, res) => {
    const user = req.user;
    
    if (user.role !== "superAdmin") {
        throw new ApiError(403, "Only superAdmins can view all tenants");
    }

    const tenants = await Tenant.find({}).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, tenants, "Tenants fetched successfully")
    );
});
