import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Tenant } from "../models/tenantModel.js";
import { User } from "../../users/models/userModel.js";
import { Orders } from "../../outlet/orders/models/orderModel.js";
import mongoose from "mongoose";

/**
 * PATCH /api/v1/tenants/:tenantId/toggle-status
 * Enable or disable a tenant.
 */
const toggleTenantStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== "superAdmin") throw new ApiError(403, "Forbidden");

  const { tenantId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tenantId))
    throw new ApiError(400, "Invalid tenant ID");

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new ApiError(404, "Tenant not found");

  tenant.status = !tenant.status;
  await tenant.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { tenant },
      `Tenant ${tenant.status ? "enabled" : "disabled"} successfully`
    )
  );
});

/**
 * GET /api/v1/tenants/:tenantId/details
 * Full details for a single tenant: contacts, users list, order stats.
 */
const getTenantDetails = asyncHandler(async (req, res) => {
  const { role } = req.user;

  // tenantAdmin/Owner may only see their own tenant
  if (["tenantAdmin", "tenantOwner"].includes(role)) {
    if (req.user.tenant?.tenantId?.toString() !== req.params.tenantId)
      throw new ApiError(403, "Forbidden");
  } else if (role !== "superAdmin") {
    throw new ApiError(403, "Forbidden");
  }

  const { tenantId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(tenantId))
    throw new ApiError(400, "Invalid tenant ID");

  const tenantObjId = new mongoose.Types.ObjectId(tenantId);

  const [tenant, users, orderStats] = await Promise.all([
    Tenant.findById(tenantObjId).lean(),

    User.find({ "tenant.tenantId": tenantObjId })
      .select("name email role status phoneNumber createdAt")
      .lean(),

    Orders.aggregate([
      { $match: { tenantId: tenantObjId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "Completed"] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$orderStatus", "Pending"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  if (!tenant) throw new ApiError(404, "Tenant not found");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tenant,
        users,
        orderStats: orderStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          completedOrders: 0,
          pendingOrders: 0,
        },
      },
      "Tenant details fetched"
    )
  );
});

export { toggleTenantStatus, getTenantDetails };
