import {Tenant} from "../models/tenantModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateCreateTenant } from "../services/validation.js";
import { ensureUniqueTenantFields } from "../services/ensureUnique.js"; 

export const createTenant = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "superAdmin") {
      throw new ApiError(403, "Only superAdmins can create tenants");
    }

    const { name, contacts, address, location } = req.body;
    validateCreateTenant(req.body);

    await ensureUniqueTenantFields(name, contacts);

    try {
      const tenant = new Tenant({
        name,
        contacts,
        address,
        location
      });
      await tenant.save();
      return res.status(201).json(new ApiResponse(201, tenant, "Tenant created successfully"));
    } catch (error) {
      throw new ApiError(500, "Failed to create tenant");
    }
});