import { Outlet } from "../models/outletModel.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { validateCreateOutlet } from "../services/validation.js";
import { ensureUniqueOutletFields } from "../services/ensureUnique.js";

export const createOutlet = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenantAdmins can create outlets");
  }

  const { name, contacts, imageUrl, location, timings, owner ,address } =
    req.body;

  req.body.tenant = user.tenant;
  console.log("req.body: " , req.body)

  validateCreateOutlet(req.body);
  await ensureUniqueOutletFields(name, req.body.tenant, contacts);


  try {
    const outlet = new Outlet({
      name,
      contacts,
      imageUrl,
      location,
      timings,
      tenant: req.body.tenant,
      owner,
      address
    });

    await outlet.save();
    return res
      .status(201)
      .json(new ApiResponse(201, outlet, "Outlet created successfully"));
  } catch (error) {
    console.log("Errorrrrr heree : " , error)
    throw new ApiError(500, "Failed to create outlet");
  }
});
