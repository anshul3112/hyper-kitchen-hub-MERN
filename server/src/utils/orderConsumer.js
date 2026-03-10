import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { Orders } from "../outlet/orders/models/orderModel.js";
import { Inventory } from "../items/models/inventoryModel.js";
import { getNextOrderNumber } from "../outlet/core/controllers/getNextOrderNumber.js";
import { callMockPayment } from "../outlet/utils/mockPayment.js";
import { emitNewOrder, emitInventoryUpdate, emitOrderConfirmed, emitOrderFailed, emitLowStockAlert } from "./socket.js";


const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;
const SQS_REGION = process.env.AWS_REGION;

// ── SQS client ────────────────────────────────────────────────────────────────
const sqsClient = new SQSClient({
  region: SQS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,
  },
});


// ── Inventory helpers (no MongoDB sessions — FIFO queue ensures serialisation) ─

/**
 * Attempt to atomically decrement inventory for ALL items.
 * If every item has sufficient stock → all decrements are applied, returns [].
 * If ANY item has insufficient stock → every decrement that already succeeded
 * is rolled back before returning, and the full list of failed items is returned.
 * This guarantees an all-or-nothing outcome with no partial inventory changes.
 */
async function tryDecrementInventory(items, outletId) {
  const decremented = []; // items whose inventory was successfully decremented so far
  const failed = [];

  for (const it of items) {
    const result = await Inventory.updateOne(
      { itemId: it.id, outletId, quantity: { $gte: it.quantity } },
      { $inc: { quantity: -it.quantity } }
    );

    if (result.modifiedCount === 0) {
      failed.push(it);
    } else {
      decremented.push(it);
    }
  }

  // Roll back any decrements that went through before the failure was detected
  if (failed.length > 0 && decremented.length > 0) {
    await restoreInventory(decremented, outletId);
  }

  return failed;
}

/**
 * Restore inventory quantities for items whose payment failed or order failed due to insufficient stock of other items.
 */
async function restoreInventory(items, outletId) {
  await Promise.all(
    items.map((it) =>
      Inventory.updateOne(
        { itemId: it.id, outletId },
        { $inc: { quantity: it.quantity } }
      )
    )
  );
}

// ── Core processor ────────────────────────────────────────────────────────────
/**
 * Process one SQS order message end-to-end:
 *
 *  1. Check & atomically decrement inventory
 *     → insufficient stock: create a Failed order and return
 *  2. Get next order number
 *  3. Create order document (Pending)
 *  4. Call mock payment
 *     → success: mark Completed, emit socket events, broadcast inventory
 *     → failure: restore inventory, mark Failed
 */
async function processOrderMessage(body) {
  const { correlationId, outletId, outletName, tenantId, tenantName, items, totalAmount, paymentDetails } = body;

  console.log(
    `[SQS consumer] Processing correlationId: ${correlationId} | outletId: ${outletId}`
  );

  // ── Step 1: atomic inventory decrement ────────────────────────────────────
  const insufficientItems = await tryDecrementInventory(items, outletId);

  if (insufficientItems.length > 0) {
    const names = insufficientItems.map((it) => it.name ?? it.id).join(", ");
    console.warn(
      `[SQS consumer] Insufficient stock for [${names}] — correlationId: ${correlationId}`
    );

    // Create a record so the kiosk / analytics can see the failure
    const now = new Date();
    await Orders.create({
      orderNo: 0, 
      name: paymentDetails.name,
      time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      itemsCart: items.map((it) => ({
        itemId: it.id,
        name: it.name,
        qty: it.quantity,
        price: it.price,
      })),
      totalAmount,
      tenant: { tenantId, tenantName },
      outlet: { outletId, outletName },
      paymentStatus: "failed",
      paymentDetails: null,
      orderStatus: "Failed",
    });

    // Notify the kiosk that its order could not be fulfilled due to stock
    emitOrderFailed(outletId.toString(), {
      orderId: correlationId,
      reason: "out_of_stock",
      outOfStockItems: insufficientItems.map((it) => it.name ?? it.id),
    });

    return; // message will be deleted by the caller
  }

  //  Step 2: get next order number ────
  const orderNo = await getNextOrderNumber(outletId);

  //  Step 3: create Pending order ─────
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const order = await Orders.create({
    orderNo,
    name: paymentDetails.name,
    time: timeStr,
    itemsCart: items.map((it) => ({
      itemId: it.id,
      name: it.name,
      qty: it.quantity,
      price: it.price,
    })),
    totalAmount,
    tenant: { tenantId, tenantName },
    outlet: { outletId, outletName },
    paymentStatus: "pending",
    paymentDetails: null,
    orderStatus: "Pending",
  });

  console.log(`[SQS consumer] Order created — orderId: ${order._id} | orderNo: ${orderNo}`);

  // ── Step 4: mock payment ───────────────────────────────────────────────────
  const paymentResult = await callMockPayment();
  const paymentSucceeded = paymentResult.paymentStatus === "done";

  if (paymentSucceeded) {
    // Mark Completed
    order.paymentStatus = "done";
    order.orderStatus = "Completed";
    order.paymentDetails = paymentDetails;
    await order.save();

    // Emit new order to outlet room (kitchen / admin screens)
    emitNewOrder(outletId, order.toObject());

    // Notify the originating kiosk that its order was confirmed
    emitOrderConfirmed(outletId.toString(), {
      orderId: correlationId,
      orderNo: order.orderNo,
    });

    // Fetch fresh inventory quantities and broadcast to kiosks
    const itemIds = items.map((it) => it.id);
    const updatedInventory = await Inventory.find({ itemId: { $in: itemIds }, outletId });
    updatedInventory.forEach((rec) => {
      emitInventoryUpdate(outletId.toString(), {
        itemId: rec.itemId.toString(),
        price: rec.price ?? null,
        quantity: rec.quantity,
        status: rec.status,
      });

      // Fire low-stock alert if the new quantity is at or below the threshold
      if (rec.lowStockThreshold != null && rec.quantity <= rec.lowStockThreshold) {
        emitLowStockAlert(outletId.toString(), {
          itemId: rec.itemId.toString(),
          itemName: items.find((it) => it.id === rec.itemId.toString())?.name ?? rec.itemId.toString(),
          quantity: rec.quantity,
          lowStockThreshold: rec.lowStockThreshold,
        });
      }
    });

    console.log(
      `[SQS consumer] Order ${order._id} completed successfully — correlationId: ${correlationId}`
    );
  } else {
    // Payment failed — restore inventory and mark order Failed
    await restoreInventory(items, outletId);
    order.paymentStatus = "failed";
    order.orderStatus = "Failed";
    await order.save();

    // Notify the originating kiosk that its order failed due to payment
    emitOrderFailed(outletId.toString(), { orderId: correlationId, reason: "payment_failed" });

    console.warn(
      `[SQS consumer] Payment failed for order ${order._id} — inventory restored | correlationId: ${correlationId}`
    );
  }
}

// ── Delete helper ─────────────────────────────────────────────────────────────
async function deleteMessage(receiptHandle) {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
}

// ── Polling loop ──────────────────────────────────────────────────────────────
/**
 * startOrderConsumer — infinite long-poll loop, started once at server boot
 * (after initSocket so socket events can be emitted from inside the worker).
 *
 * SQS FIFO behaviour:
 *  - MessageGroupId = outletId → messages for each outlet arrive in order.
 *  - MaxNumberOfMessages: 1    → one message processed at a time.
 *  - WaitTimeSeconds: 20       → long polling reduces empty-receive costs.
 *  - Message is deleted ONLY after successful processing.
 *  - On processing error the message is NOT deleted; SQS returns it after the
 *    visibility timeout expires, giving automatic retry.
 */
export async function startOrderConsumer() {
  if (!QUEUE_URL) {
    console.warn("[SQS consumer] AWS_SQS_QUEUE_URL not set — consumer will not start");
    return;
  }

  console.log("[SQS consumer] Starting order consumer worker…");

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          AttributeNames: ["All"],
          MessageAttributeNames: ["All"],
        })
      );

      const messages = response.Messages ?? [];
      if (messages.length === 0) continue;

      const { ReceiptHandle, Body, MessageId } = messages[0];

      let body;
      try {
        body = JSON.parse(Body);
      } catch (parseErr) {
        console.error(`[SQS consumer] Malformed message ${MessageId} — deleting:`, parseErr.message);
        await deleteMessage(ReceiptHandle);
        continue;
      }

      try {
        await processOrderMessage(body);
        await deleteMessage(ReceiptHandle);
        console.log(`[SQS consumer] Message ${MessageId} deleted from queue`);
      } catch (processingErr) {
        // Leave in queue — will become visible again after visibility timeout
        console.error(
          `[SQS consumer] Processing error for correlationId ${body?.correlationId ?? "unknown"} (will retry):`,
          processingErr.message
        );
      }
    } catch (receiveErr) {
      console.error("[SQS consumer] ReceiveMessage error:", receiveErr.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
