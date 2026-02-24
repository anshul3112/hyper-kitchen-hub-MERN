import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Orders } from "../../orders/models/orderModel.js";
import { getIO } from "../../../utils/socket.js";

const FULFILLMENT_SEQUENCE = [
  "created",
  "received",
  "cooking",
  "prepared",
  "served",
];

/**
 * PATCH /api/v1/kitchen/orders/:orderId/status
 * Protected by verifyJWT.
 *
 * Advances the order's fulfillmentStatus one step forward in the sequence:
 *   created → received → cooking → prepared → served
 *
 * Emits  order:status  to the outlet room after every transition so all
 * clients (other kitchen screens, billing, outlet admin) stay in sync.
 */
export const updateFulfillmentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const outletId = req.user?.outlet?.outletId?.toString();

  if (!outletId) {
    throw new ApiError(403, "No outlet associated with this user");
  }

  const order = await Orders.findOne({ _id: orderId, outletId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const currentIndex = FULFILLMENT_SEQUENCE.indexOf(order.fulfillmentStatus);
  if (currentIndex === -1) {
    throw new ApiError(400, `Unknown fulfillmentStatus: ${order.fulfillmentStatus}`);
  }
  if (currentIndex === FULFILLMENT_SEQUENCE.length - 1) {
    throw new ApiError(400, "Order is already in the final served state");
  }

  const nextStatus = FULFILLMENT_SEQUENCE[currentIndex + 1];
  order.fulfillmentStatus = nextStatus;
  await order.save();

  // Emit real-time update to all clients in this outlet's room
  try {
    getIO()
      .to(`outlet:${outletId}`)
      .emit("order:status", {
        orderId: order._id.toString(),
        orderNo: order.orderNo,
        fulfillmentStatus: nextStatus,
      });
  } catch {
    // Socket may not be connected in tests — non-fatal
  }

  return res.status(200).json(
    new ApiResponse(200, order, `Order status advanced to "${nextStatus}"`)
  );
});
