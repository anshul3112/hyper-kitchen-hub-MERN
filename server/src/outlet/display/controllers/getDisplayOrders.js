import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Orders } from "../../orders/models/orderModel.js";

/**
 * GET /api/v1/displays/orders
 * Protected by verifyDisplayJWT.
 *
 * Returns all Completed orders for this display's outlet that haven't
 * been served yet — i.e., the active queue visible to customers.
 * Sorted oldest-first so the board renders in arrival order.
 */
export const getDisplayOrders = asyncHandler(async (req, res) => {
  const outletId = req.display?.outlet?.outletId;
  if (!outletId) {
    throw new ApiError(403, "No outlet associated with this display device");
  }

  const orders = await Orders.find({
    outletId,
    orderStatus: "Completed",
    fulfillmentStatus: { $ne: "served" },
  })
    .select("orderNo fulfillmentStatus time totalAmount itemsCart createdAt")
    .sort({ createdAt: 1 });

  return res.status(200).json(
    new ApiResponse(200, orders, "Active display orders fetched")
  );
});
