import { randomUUID } from "crypto";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { sendOrderMessage } from "../../../utils/sqsProducer.js";
import { emitOrderPending } from "../../../utils/socket.js";

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
 * Flow (SQS FIFO architecture):
 *  1. Validate request body
 *  2. Enqueue message to SQS FIFO queue (MessageGroupId = outletId)
 *  3. Return 202 Accepted immediately
 *
 * All heavy lifting (inventory check, order creation, payment, socket events)
 * is handled sequentially per-outlet by the consumer worker (orderConsumer.js).
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
  const outletId   = req.kiosk?.outlet?.outletId;
  const outletName = req.kiosk?.outlet?.outletName;
  const tenantId   = req.kiosk?.tenant?.tenantId;
  const tenantName = req.kiosk?.tenant?.tenantName;
  const kioskId    = req.kiosk?._id;

  if (!outletId || !tenantId) {
    throw new ApiError(401, "Invalid kiosk session: missing outlet or tenant context");
  }

  // ── Generate a correlation ID that ties this HTTP request to the WebSocket event ─
  // The kiosk receives it in the 202 response and subscribes to "order:confirmed" / "order:failed"
  // keyed by this ID.  The consumer emits those events after processing the SQS message.
  const correlationId = randomUUID();

  // ── Notify the kiosk immediately so it can show the "pending" state ────────
  emitOrderPending(outletId.toString(), { orderId: correlationId });

  // ── Enqueue to SQS FIFO ────────────────────────────────────────────────────
  // The consumer handles inventory check, order creation, payment, and socket events.
  await sendOrderMessage({
    correlationId,
    items,
    totalAmount,
    paymentDetails,
    outletId:   outletId.toString(),
    outletName: outletName ?? "",
    tenantId:   tenantId.toString(),
    tenantName: tenantName ?? "",
    kioskId:    kioskId?.toString() ?? "unknown",
  });

  return res.status(202).json(
    new ApiResponse(202, { orderId: correlationId }, "Order received and is being processed")
  );
});


