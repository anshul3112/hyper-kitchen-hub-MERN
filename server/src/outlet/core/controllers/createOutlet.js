import { Outlet } from "../models/outletModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { validateCreateOutlet } from "../services/validation.js";
import { parseDuplicateKeyError } from "../../../utils/mongoError.js";

/**
 * POST /api/v1/outlets
 * Create a new outlet. Only tenantAdmins can call this.
 */
export const createOutlet = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenantAdmins can create outlets");
  }

  const { name, contacts, imageUrl, location, timings, owner, address } = req.body;
  req.body.tenant = user.tenant;

  validateCreateOutlet(req.body);


  const outlet = new Outlet({
    name,
    contacts,
    imageKey: imageUrl,
    location,
    timings,
    tenant: req.body.tenant,
    owner,
    address,
  });

  try {
    await outlet.save();
  } catch (err) {
    throw parseDuplicateKeyError(err, {
      name: "Outlet with this name already exists",
      "contacts.email": "Outlet with this email already exists",
      "contacts.phoneNumber": "Outlet with this phone number already exists",
    }) ?? err;
  }
  return res.status(201).json(new ApiResponse(201, outlet, "Outlet created successfully"));
});
