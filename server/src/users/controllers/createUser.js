import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseDuplicateKeyError } from "../../utils/mongoError.js";
import {
  validateCreateTenantAdmin,
  validateCreateOutletAdmin,
  validateCreateSuperAdmin,
  validateCreateOutletStaff,
} from "../services/validation.js";

const OUTLET_STAFF_ROLES = ["kitchenStaff", "billingStaff"];

/**
 * POST /api/v1/users/create-outlet-staff
 * Only outletAdmins can create kitchenStaff / billingStaff for their own outlet.
 * outlet & tenant are inherited from the creating user — not supplied in the body.
 */
export const createOutletStaff = asyncHandler(async (req, res) => {
  const creator = req.user;
  if (creator.role !== "outletAdmin") {
    throw new ApiError(403, "Only outletAdmins can create outlet staff");
  }

  const { name, email, password, phoneNumber, role } = req.body;

  if (!role || !OUTLET_STAFF_ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${OUTLET_STAFF_ROLES.join(", ")}`);
  }

  
  validateCreateOutletStaff(req.body);

  const staffUser = new User({
    name,
    email,
    password,
    role,
    phoneNumber,
    outlet: creator.outlet,
    tenant: creator.tenant,
  });

  try {
    await staffUser.save();
  } catch (err) {
    throw parseDuplicateKeyError(err) ?? err;
  }

  const { password: _, ...staffData } = staffUser.toObject();
  return res
    .status(201)
    .json(new ApiResponse(201, staffData, `${role} created successfully`));
});

/**
 * POST /api/v1/users/create-tenant-admin
 * Create a tenantAdmin user. Only superAdmins can call this.
 */
export const createTenantAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "superAdmin") {
    throw new ApiError(403, "Only superAdmins can create tenant admins");
  }

    const { name, email, password, tenant, phoneNumber } = req.body; 

    validateCreateTenantAdmin(req.body);

    const tenantAdmin = new User({
      name,
      email,
      password,
      role: "tenantAdmin",
      tenant,
      phoneNumber,
    });

    try {
      await tenantAdmin.save();
    } catch (err) {
      throw parseDuplicateKeyError(err) ?? err;
    }

    const {password: _, ...tenantAdminData} = tenantAdmin.toObject();

    res
      .status(201)
      .json(
        new ApiResponse(201, tenantAdminData, "Tenant Admin created successfully"),
      );
});

/**
 * POST /api/v1/users/create-outlet-admin
 * Create an outletAdmin user. Only tenantAdmins can call this.
 */
export const createOutletAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenantAdmins can create outlet admins");
  }

  const { name, email, password, tenant, outlet, phoneNumber } = req.body;

  validateCreateOutletAdmin(req.body);
  const outletAdmin = new User({
    name,
    email,
    password,
    role: "outletAdmin",
    tenant,
    outlet,
    phoneNumber,
  });

  try {
    await outletAdmin.save();
  } catch (err) {
    throw parseDuplicateKeyError(err) ?? err;
  }
  const {password: _, ...outletAdminData} = outletAdmin.toObject();
  res
    .status(201)
    .json(
      new ApiResponse(201, outletAdminData, "Outlet Admin created successfully"),
    );
});

/**
 * POST /api/v1/users/create-super-admin
 * Create an additional superAdmin account. Only superAdmins can call this.
 */
export const createSuperAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "superAdmin") {
    throw new ApiError(403, "Only superAdmins can create super admins");
  }

    const { name, email, password, phoneNumber } = req.body;
    validateCreateSuperAdmin(req.body);
    const superAdmin = new User({
      name,
      email,
      password,
      role: "superAdmin",
      phoneNumber,
    });
    try {
      await superAdmin.save();
    } catch (err) {
      throw parseDuplicateKeyError(err) ?? err;
    }

    const {password: _, ...superAdminData} = superAdmin.toObject();

    res.status(201)
      .json(
        new ApiResponse(201, superAdminData, "Super Admin created successfully"),
      );
  
});