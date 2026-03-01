import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Orders } from "../../orders/models/orderModel.js";
import { Tenant } from "../../../tenant/models/tenantModel.js";
import { User } from "../../../users/models/userModel.js";
import mongoose from "mongoose";

/**
 * GET /api/v1/analytics/overview
 * High-level KPIs: orders, revenue, tenants, users, 7-day trend, top tenants.
 */
const getAnalyticsOverview = asyncHandler(async (req, res) => {
  if (req.user.role !== "superAdmin") throw new ApiError(403, "Forbidden");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [orderStats, tenantStats, userStats, revenueTrend, revenueByTenant, recentOrders] =
    await Promise.all([
      // Overall order KPIs
      Orders.aggregate([
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
            failedOrders: {
              $sum: { $cond: [{ $eq: ["$orderStatus", "Failed"] }, 1, 0] },
            },
          },
        },
      ]),

      // Tenant counts
      Tenant.aggregate([
        {
          $group: {
            _id: null,
            totalTenants: { $sum: 1 },
            activeTenants: { $sum: { $cond: ["$status", 1, 0] } },
            inactiveTenants: { $sum: { $cond: ["$status", 0, 1] } },
          },
        },
      ]),

      // User counts by role
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: "$count" },
            byRole: { $push: { role: "$_id", count: "$count" } },
          },
        },
      ]),

      // Daily revenue last 7 days
      Orders.aggregate([
        { $match: { date: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            revenue: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", revenue: 1, orders: 1, _id: 0 } },
      ]),

      // Top 8 tenants by revenue
      Orders.aggregate([
        { $group: { _id: "$tenantId", revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "tenants",
            localField: "_id",
            foreignField: "_id",
            as: "tenant",
          },
        },
        { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            tenantId: "$_id",
            tenantName: { $ifNull: ["$tenant.name", "Unknown"] },
            revenue: 1,
            orders: 1,
            _id: 0,
          },
        },
      ]),

      // 5 most recent orders
      Orders.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders: orderStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          completedOrders: 0,
          pendingOrders: 0,
          failedOrders: 0,
        },
        tenants: tenantStats[0] || {
          totalTenants: 0,
          activeTenants: 0,
          inactiveTenants: 0,
        },
        users: userStats[0] || { totalUsers: 0, byRole: [] },
        revenueTrend,
        revenueByTenant,
        recentOrders,
      },
      "Analytics overview fetched"
    )
  );
});

/**
 * GET /api/v1/analytics/orders
 * Paginated order history with optional tenant / status / date filters.
 * Query: page, limit, tenantId, status, startDate, endDate
 */
const getOrderHistory = asyncHandler(async (req, res) => {
  if (req.user.role !== "superAdmin") throw new ApiError(403, "Forbidden");

  const { page = 1, limit = 20, tenantId, status, startDate, endDate } = req.query;

  const matchStage = {};
  if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
    matchStage.tenantId = new mongoose.Types.ObjectId(tenantId);
  }
  if (status) matchStage.orderStatus = status;
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.date.$lte = end;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Orders.aggregate([
      { $match: matchStage },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "tenants",
          localField: "tenantId",
          foreignField: "_id",
          as: "tenant",
        },
      },
      { $unwind: { path: "$tenant", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "outlets",
          localField: "outletId",
          foreignField: "_id",
          as: "outlet",
        },
      },
      { $unwind: { path: "$outlet", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orderNo: 1,
          name: 1,
          totalAmount: 1,
          orderStatus: 1,
          fulfillmentStatus: 1,
          paymentStatus: 1,
          date: 1,
          itemsCart: 1,
          tenantId: 1,
          tenantName: { $ifNull: ["$tenant.name", "Unknown"] },
          outletId: 1,
          outletName: { $ifNull: ["$outlet.name", "Unknown"] },
        },
      },
    ]),
    Orders.countDocuments(matchStage),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      "Order history fetched"
    )
  );
});

/**
 * GET /api/v1/analytics/revenue-trends
 * Daily totals for the last N days.
 * Query: days (default 30), tenantId
 */
const getRevenueTrends = asyncHandler(async (req, res) => {
  if (req.user.role !== "superAdmin") throw new ApiError(403, "Forbidden");

  const { days = 30, tenantId } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (Number(days) - 1));
  startDate.setHours(0, 0, 0, 0);

  const matchStage = { date: { $gte: startDate } };
  if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
    matchStage.tenantId = new mongoose.Types.ObjectId(tenantId);
  }

  const trends = await Orders.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$orderStatus", "Completed"] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", revenue: 1, orders: 1, completed: 1, _id: 0 } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, { trends }, "Revenue trends fetched")
  );
});

/**
 * GET /api/v1/analytics/tenant-orders
 * Paginated orders scoped to the calling tenantAdmin/Owner's tenant.
 * Query: page, limit, outletId, status, startDate, endDate
 */
const getTenantOrderHistory = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const allowedRoles = ["superAdmin", "tenantAdmin", "tenantOwner"];
  if (!allowedRoles.includes(role)) throw new ApiError(403, "Forbidden");

  // Resolve which tenant to scope to
  let tenantObjId;
  if (role === "superAdmin") {
    const { tenantId } = req.query;
    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId))
      throw new ApiError(400, "tenantId is required for superAdmin");
    tenantObjId = new mongoose.Types.ObjectId(tenantId);
  } else {
    const tid = req.user.tenant?.tenantId;
    if (!tid) throw new ApiError(400, "Tenant not found on user");
    tenantObjId = new mongoose.Types.ObjectId(tid);
  }

  const { page = 1, limit = 20, outletId, status, startDate, endDate } = req.query;

  const matchStage = { tenantId: tenantObjId };
  if (outletId && mongoose.Types.ObjectId.isValid(outletId))
    matchStage.outletId = new mongoose.Types.ObjectId(outletId);
  if (status) matchStage.orderStatus = status;
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.date.$lte = end;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Orders.aggregate([
      { $match: matchStage },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "outlets", localField: "outletId", foreignField: "_id", as: "outlet",
        },
      },
      { $unwind: { path: "$outlet", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orderNo: 1, name: 1, totalAmount: 1, orderStatus: 1,
          fulfillmentStatus: 1, paymentStatus: 1, date: 1, itemsCart: 1,
          tenantId: 1, outletId: 1,
          outletName: { $ifNull: ["$outlet.name", "Unknown"] },
        },
      },
    ]),
    Orders.countDocuments(matchStage),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: Number(page), limit: Number(limit), total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, "Tenant order history fetched")
  );
});

/**
 * GET /api/v1/analytics/outlet-orders
 * Paginated orders scoped to the calling outletAdmin/Owner's outlet.
 * Query: page, limit, status, startDate, endDate
 */
const getOutletOrderHistory = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const allowedRoles = ["superAdmin", "tenantAdmin", "tenantOwner", "outletAdmin", "outletOwner"];
  if (!allowedRoles.includes(role)) throw new ApiError(403, "Forbidden");

  let outletObjId;
  if (["outletAdmin", "outletOwner"].includes(role)) {
    const oid = req.user.outlet?.outletId;
    if (!oid) throw new ApiError(400, "Outlet not found on user");
    outletObjId = new mongoose.Types.ObjectId(oid);
  } else {
    const { outletId } = req.query;
    if (!outletId || !mongoose.Types.ObjectId.isValid(outletId))
      throw new ApiError(400, "outletId is required");
    outletObjId = new mongoose.Types.ObjectId(outletId);
  }

  const { page = 1, limit = 20, status, startDate, endDate } = req.query;

  const matchStage = { outletId: outletObjId };
  if (status) matchStage.orderStatus = status;
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.date.$lte = end;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Orders.aggregate([
      { $match: matchStage },
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          orderNo: 1, name: 1, totalAmount: 1, orderStatus: 1,
          fulfillmentStatus: 1, paymentStatus: 1, date: 1, itemsCart: 1,
          outletId: 1, tenantId: 1,
        },
      },
    ]),
    Orders.countDocuments(matchStage),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: Number(page), limit: Number(limit), total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, "Outlet order history fetched")
  );
});

/**
 * GET /api/v1/analytics/hourly
 * Hourly order count + revenue for a specific date.
 * Query: date (YYYY-MM-DD, default today), outletId (optional for tenant-level)
 * Auth: outletAdmin/Owner → own outlet; tenantAdmin/Owner → own tenant (optional outletId filter);
 *       superAdmin → requires tenantId or outletId
 */
const getHourlyHistory = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const allowedRoles = ["superAdmin", "tenantAdmin", "tenantOwner", "outletAdmin", "outletOwner"];
  if (!allowedRoles.includes(role)) throw new ApiError(403, "Forbidden");

  const { date, outletId } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const matchStage = { date: { $gte: dayStart, $lte: dayEnd } };

  if (["outletAdmin", "outletOwner"].includes(role)) {
    const oid = req.user.outlet?.outletId;
    if (!oid) throw new ApiError(400, "Outlet not found on user");
    matchStage.outletId = new mongoose.Types.ObjectId(oid);
  } else if (["tenantAdmin", "tenantOwner"].includes(role)) {
    const tid = req.user.tenant?.tenantId;
    if (!tid) throw new ApiError(400, "Tenant not found on user");
    matchStage.tenantId = new mongoose.Types.ObjectId(tid);
    if (outletId && mongoose.Types.ObjectId.isValid(outletId))
      matchStage.outletId = new mongoose.Types.ObjectId(outletId);
  } else {
    // superAdmin: must provide tenantId or outletId
    const { tenantId } = req.query;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId))
      matchStage.tenantId = new mongoose.Types.ObjectId(tenantId);
    if (outletId && mongoose.Types.ObjectId.isValid(outletId))
      matchStage.outletId = new mongoose.Types.ObjectId(outletId);
  }

  const hourly = await Orders.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $hour: "$date" },
        orders: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
        completed: { $sum: { $cond: [{ $eq: ["$orderStatus", "Completed"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { hour: "$_id", orders: 1, revenue: 1, completed: 1, _id: 0 } },
  ]);

  // Fill all 24 hours with 0 if no data
  const filled = Array.from({ length: 24 }, (_, h) => {
    const found = hourly.find((x) => x.hour === h);
    return found ?? { hour: h, orders: 0, revenue: 0, completed: 0 };
  });

  return res.status(200).json(
    new ApiResponse(200, { date: targetDate.toISOString().split("T")[0], hourly: filled }, "Hourly history fetched")
  );
});

export { getAnalyticsOverview, getOrderHistory, getRevenueTrends, getTenantOrderHistory, getOutletOrderHistory, getHourlyHistory };
