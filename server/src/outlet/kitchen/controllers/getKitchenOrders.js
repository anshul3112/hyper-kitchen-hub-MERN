import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Orders } from "../../orders/models/orderModel.js";

/**
 * GET /api/v1/kitchen/orders
 * Protected by verifyJWT.
 *
 * Returns all orders for the authenticated user's outlet that are:
 *  - orderStatus === "Completed"   (payment succeeded, visible to kitchen)
 *  - fulfillmentStatus !== "served" (already served orders are hidden)
 * Sorted oldest-first so kitchen works in order.
 */
export const getKitchenOrders = asyncHandler(async (req, res) => {
  const outletId = req.user?.outlet?.outletId;
  if (!outletId) {
    throw new ApiError(403, "No outlet associated with this user");
  }

  const orders = await Orders.find({
    outletId,
    orderStatus: "Completed",
    fulfillmentStatus: { $ne: "served" },
  }).sort({ createdAt: 1 }); // oldest first

  return res.status(200).json(
    new ApiResponse(200, orders, "Kitchen orders fetched successfully")
  );
});
