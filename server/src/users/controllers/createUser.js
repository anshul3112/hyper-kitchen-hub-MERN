import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ensureUniqueEmailAndPhone } from "../services/ensureUnique.js";
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
  await ensureUniqueEmailAndPhone(email, phoneNumber);

  const staffUser = new User({
    name,
    email,
    password,
    role,
    phoneNumber,
    outlet: creator.outlet,
    tenant: creator.tenant,
  });

  await staffUser.save();

  const { password: _, ...staffData } = staffUser.toObject();
  return res
    .status(201)
    .json(new ApiResponse(201, staffData, `${role} created successfully`));
});

export const createTenantAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "superAdmin") {
    throw new ApiError(403, "Only superAdmins can create tenant admins");
  }

  try {
    const { name, email, password, tenant, phoneNumber } = req.body; 

    validateCreateTenantAdmin(req.body);

    await ensureUniqueEmailAndPhone(email, phoneNumber);

    const tenantAdmin = new User({
      name,
      email,
      password,
      role: "tenantAdmin",
      tenant,
      phoneNumber,
    });

    await tenantAdmin.save();

    const {password: _, ...tenantAdminData} = tenantAdmin.toObject();

    res
      .status(201)
      .json(
        new ApiResponse(201, tenantAdminData, "Tenant Admin created successfully"),
      );
  } catch (err) {
    console.error("Error creating user:", err);
    throw new ApiError(500, err.message || "Internal Server Error");
  }
});

export const createOutletAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenantAdmins can create outlet admins");
  }

  try {
    const { name, email, password, tenant, outlet, phoneNumber } = req.body;

    validateCreateOutletAdmin(req.body);
    await ensureUniqueEmailAndPhone(email, phoneNumber);
    const outletAdmin = new User({
      name,
      email,
      password,
      role: "outletAdmin",
      tenant,
      outlet,
      phoneNumber,
    });

    await outletAdmin.save();
    const {password: _, ...outletAdminData} = outletAdmin.toObject();
    res
      .status(201)
      .json(
        new ApiResponse(201, outletAdminData, "Outlet Admin created successfully"),
      );
  } catch (err) {
    console.error("Error creating user:", err);
    throw new ApiError(500, err.message || "Internal Server Error");
  }
});

export const createSuperAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "superAdmin") {
    throw new ApiError(403, "Only superAdmins can create super admins");
  }

  try {
    const { name, email, password, phoneNumber } = req.body;
    validateCreateSuperAdmin(req.body);
    await ensureUniqueEmailAndPhone(email, phoneNumber);
    const superAdmin = new User({
      name,
      email,
      password,
      role: "superAdmin",
      phoneNumber,
    });
    await superAdmin.save();

    const {password: _, ...superAdminData} = superAdmin.toObject();

    res
      .status(201)
      .json(
        new ApiResponse(201, superAdminData, "Super Admin created successfully"),
      );
  } catch (err) {
    console.error("Error creating user:", err);
    throw new ApiError(500, err.message || "Internal Server Error");
  }
});