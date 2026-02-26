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

export { getAnalyticsOverview, getOrderHistory, getRevenueTrends };
