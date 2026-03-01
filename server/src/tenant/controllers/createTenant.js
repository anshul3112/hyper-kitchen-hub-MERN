import {Tenant} from "../models/tenantModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateCreateTenant } from "../services/validation.js";
import { parseDuplicateKeyError } from "../../utils/mongoError.js";

/**
 * POST /api/v1/tenants/create-tenant
 * Create a new tenant. Only superAdmins can call this.
 */
export const createTenant = asyncHandler(async (req, res) => {
    const user = req.user;
    if (user.role !== "superAdmin") {
      throw new ApiError(403, "Only superAdmins can create tenants");
    }

    const { name, contacts, address, location } = req.body;
    validateCreateTenant(req.body);

    const tenant = new Tenant({ name, contacts, address, location });
    console.log("Tenant : " , tenant);
    try {
      await tenant.save();
    } catch (err) {
      throw parseDuplicateKeyError(err, {
        name: "Tenant with this name already exists",
        "contacts.email": "A tenant with this email already exists",
        "contacts.phoneNumber": "A tenant with this phone number already exists",
      }) ?? err;
    }
    return res.status(201).json(new ApiResponse(201, tenant, "Tenant created successfully"));
});;