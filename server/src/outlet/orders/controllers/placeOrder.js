import mongoose from "mongoose";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { Orders } from "../models/orderModel.js";
import { callMockPayment } from "../../utils/mockPayment.js";
import { getNextOrderNumber } from "../../core/controllers/getNextOrderNumber.js";
import { reserveInventoryStock, restoreInventoryStock } from "../../utils/decrementInventory.js";

/**
 * POST /api/v1/orders
 * Protected by verifyKioskJWT — req.kiosk is populated by the middleware.
 *
 * Request body:
 * {
 *   items: [{ id, name, quantity, price }],
 *   totalAmount: number,
 *   paymentDetails: { name: string, upiId: string }
 * }
 *
 * Flow:
 *  Phase 1 — inside transaction:
 *    1. Reserve inventory ($inc qty by -qty, guarded by $gte check)
 *    2. Get next order number (atomic $inc on outlet.orderNumber)
 *    3. Create order with orderStatus "Pending", paymentStatus "pending"
 *  Phase 2 — outside transaction:
 *    4. Call mock payment (3-second delay)
 *    5a. Payment succeeded → update order to Completed / done
 *    5b. Payment failed   → restore inventory, update order to Failed
 */
export const placeOrder = asyncHandler(async (req, res) => {
  const { items, totalAmount, paymentDetails } = req.body;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "items array is required and must not be empty");
  }
  if (!totalAmount || typeof totalAmount !== "number") {
    throw new ApiError(400, "totalAmount is required and must be a number");
  }
  if (!paymentDetails || !paymentDetails.name || !paymentDetails.upiId) {
    throw new ApiError(400, "paymentDetails.name and paymentDetails.upiId are required");
  }

  // ── Kiosk context ──────────────────────────────────────────────────────────
  const outletId = req.kiosk?.outlet?.outletId;
  const tenantId = req.kiosk?.tenant?.tenantId;
  if (!outletId || !tenantId) {
    throw new ApiError(401, "Invalid kiosk session: missing outlet or tenant context");
  }

  const session = await mongoose.startSession();
  let order;

  try {
    
    // PHASE 1 — reservation transaction
    await session.withTransaction(async () => {
      // 1. Reserve inventory (fail fast if any item has insufficient stock)
      await reserveInventoryStock(items, outletId, session);

      // 2. Get next order number
      const orderNo = await getNextOrderNumber(outletId, session);

      // 3. Create a PENDING order
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

      const [created] = await Orders.create(
        [
          {
            orderNo,
            time: timeStr,
            itemsCart: items.map((it) => ({
              itemId: it.id,
              name: it.name,
              qty: it.quantity,
              price: it.price,
            })),
            totalAmount,
            outletId,
            tenantId,
            paymentStatus: "pending",
            paymentDetails: null,
            orderStatus: "Pending",
          },
        ],
        { session }
      );

      order = created;
    });

    // PHASE 2 — payment (outside transaction)
    const paymentResult = await callMockPayment();
    const paymentSucceeded = paymentResult.paymentStatus === "done";

    if (paymentSucceeded) {
      // 5a. Payment ok → mark order Completed
      order.paymentStatus = "done";
      order.orderStatus = "Completed";
      order.paymentDetails = paymentDetails;
      await order.save();
    } else {
      // 5b. Payment failed → restore reserved inventory, mark order Failed
      await restoreInventoryStock(items, outletId);
      order.paymentStatus = "failed";
      order.orderStatus = "Failed";
      await order.save();
    }

    return res.status(201).json(
      new ApiResponse(201, order, "Order placed successfully")
    );
  } finally {
    session.endSession();
  }
});


