import mongoose from "mongoose";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { Orders } from "../outlet/orders/models/orderModel.js";
import { Inventory } from "../items/models/inventoryModel.js";
import { Items } from "../items/models/itemModel.js";
import { getNextOrderNumber } from "../outlet/core/controllers/getNextOrderNumber.js";
import { callMockPayment } from "../outlet/utils/mockPayment.js";
import { resolveSchedule } from "../outlet/utils/resolveSchedule.js";
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


const DEFAULT_PREP_TIME = 3; // minutes — used when an item has no inventory record

// ── Combo expansion ───────────────────────────────────────────────────────────
/**
 * Expand any combo items in the order list to their component items.
 * A combo has no independent inventory — when one is ordered, we decrement
 * the stock of every component item instead (each by the same quantity).
 * Single (non-combo) items pass through unchanged.
 *
 * Returns the expanded list suitable for inventory operations.
 */
async function expandOrderItemsWithCombos(orderItems) {
  // Identify which order items might be combos
  const potentialComboIds = orderItems.map((it) => it.id);

  // Fetch only docs that exist and are combos
  const comboDocs = await Items.find(
    { _id: { $in: potentialComboIds }, type: 'combo' }
  ).select('_id comboItems').lean();

  if (comboDocs.length === 0) return orderItems; // no combos — fast path

  const comboMap = new Map(comboDocs.map((d) => [d._id.toString(), d.comboItems]));

  // Collect all component IDs so we can look up their names for error messages
  const allComponentIds = comboDocs.flatMap((d) => d.comboItems.map((id) => id.toString()));
  const componentDocs = await Items.find({ _id: { $in: allComponentIds } })
    .select('_id name').lean();
  const componentNameMap = new Map(componentDocs.map((d) => [d._id.toString(), d.name]));

  const expanded = [];
  for (const it of orderItems) {
    const componentIds = comboMap.get(it.id);
    if (componentIds && componentIds.length > 0) {
      // Replace the combo entry with one entry per component item
      for (const componentId of componentIds) {
        const idStr = componentId.toString();
        expanded.push({
          id: idStr,
          name: componentNameMap.get(idStr) ?? idStr,
          price: 0,           // price not used for inventory ops
          quantity: it.quantity,
        });
      }
    } else {
      expanded.push(it);
    }
  }
  return expanded;
}

// ── Prep-time helpers ────────────────────────────────────────────────────────

/**
 * Compute the prep time for the current order.
 * We use the *expanded* items list (combo components) so that every item
 * the kitchen actually has to cook is represented.  The result is the
 * maximum prepTime across all unique items — the kitchen works in parallel,
 * so total kitchen time equals the longest single item.
 */
async function computeOrderPrepTime(expandedItems, outletId) {
  const uniqueItemIds = [...new Set(expandedItems.map((it) => it.id))];

  const records = await Inventory.find(
    { itemId: { $in: uniqueItemIds }, outletId },
    { itemId: 1, prepTime: 1 }
  ).lean();

  const prepTimeMap = new Map(
    records.map((r) => [r.itemId.toString(), r.prepTime ?? DEFAULT_PREP_TIME])
  );

  return uniqueItemIds.reduce((max, id) => {
    return Math.max(max, prepTimeMap.get(id) ?? DEFAULT_PREP_TIME);
  }, 0);
}

/**
 * Aggregate the sum of prepTime for all *ongoing* orders at this outlet.
 * An order is "ongoing" when payment succeeded (orderStatus = Completed) but
 * the kitchen has not yet served it (fulfillmentStatus != 'served').
 * This sum represents the total work already queued ahead of the new order.
 */
async function computeQueueDelay(outletId) {
  const result = await Orders.aggregate([
    {
      $match: {
        "outlet.outletId": new mongoose.Types.ObjectId(outletId),
        orderStatus: "Completed",
        fulfillmentStatus: { $nin: ["served", "prepared"] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$prepTime" },
      },
    },
  ]);

  return result[0]?.total ?? 0;
}

// ── Price validation ────────────────────────────────────────────────────────
/**
 * Validate the prices in the order against the current database prices.
 * Returns an array of items whose price has changed since the frontend last fetched inventory.
 * Uses the same resolution order as getKioskInventory:
 *   resolvedActivePrice (schedule) → inventory.price → item.defaultAmount
 */
async function validateItemPrices(items, outletId) {
  const itemIds = items.map((it) => it.id);

  const [invRecords, itemDocs] = await Promise.all([
    Inventory.find({ itemId: { $in: itemIds }, outletId }).lean(),
    Items.find({ _id: { $in: itemIds } }).select("_id defaultAmount").lean(),
  ]);

  const invMap     = new Map(invRecords.map((r) => [r.itemId.toString(), r]));
  const itemDocMap = new Map(itemDocs.map((d) => [d._id.toString(), d]));

  const now = new Date();
  const changed = [];

  for (const it of items) {
    const inv     = invMap.get(it.id);
    const itemDoc = itemDocMap.get(it.id);

    let effectivePrice;
    if (!inv) {
      // No inventory record — fall back to item's catalogue price
      effectivePrice = itemDoc?.defaultAmount ?? it.price;
    } else {
      const { activePrice } = resolveSchedule(inv, now);
      effectivePrice =
        (activePrice != null ? activePrice : null) ??
        (inv.price    != null ? inv.price   : null) ??
        (itemDoc?.defaultAmount ?? it.price);
    }

    // Treat floats as equal when the difference is sub-cent
    if (Math.abs(effectivePrice - it.price) > 0.001) {
      changed.push({
        name:     it.name,
        oldPrice: it.price,
        newPrice: effectivePrice,
      });
    }
  }

  return changed;
}

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

  // Expand any combo items to their component items before touching inventory.
  // The original `items` list is kept for the order document (customer sees the
  // combo name); `expandedItems` is used for all inventory operations so that
  // the stock of each component is decremented / restored correctly.
  const expandedItems = await expandOrderItemsWithCombos(items);

  // ── Step 0.5: price validation ─────────────────────────────────────────────
  // Validate every item's price against the current DB price before touching
  // inventory or payment.  If any price has changed since the frontend last
  // fetched inventory, reject the order immediately so the customer is not
  // charged the wrong amount.
  const priceChangedItems = await validateItemPrices(items, outletId);
  if (priceChangedItems.length > 0) {
    const summary = priceChangedItems
      .map((it) => `${it.name} (₹${it.oldPrice} → ₹${it.newPrice})`)
      .join(", ");
    console.warn(
      `[SQS consumer] Price mismatch detected for [${summary}] — correlationId: ${correlationId}`
    );
    emitOrderFailed(outletId.toString(), {
      orderId: correlationId,
      reason: "price_changed",
      priceChangedItems,
    });
    return; // message will be deleted by the caller; no inventory or DB writes made
  }

  // ── Step 1: atomic inventory decrement ─────────────────────────────────────────
  const insufficientItems = await tryDecrementInventory(expandedItems, outletId);

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

  //  Step 2.5: compute ETA ────────────────────────────────────────────────────
  // currentOrderPrepTime = max prepTime of all (expanded) items in this order
  // If currentOrderPrepTime is 0 (all items are instant / packaged), ETA = 0
  // and we skip queueDelay — there is nothing to cook.
  // Otherwise: queueDelay = sum of prepTime of all ongoing orders already queued,
  //            estimatedPrepTime = queueDelay + currentOrderPrepTime
  const currentOrderPrepTime = await computeOrderPrepTime(expandedItems, outletId);
  let queueDelay = 0;
  if (currentOrderPrepTime > 0) {
    queueDelay = await computeQueueDelay(outletId);
  }
  let estimatedPrepTime = currentOrderPrepTime === 0 ? 0 : queueDelay + currentOrderPrepTime;
  // Round up to the next multiple of 5 when > 20 min and not already on a 5-min boundary
  if (estimatedPrepTime > 20 && estimatedPrepTime % 5 !== 0) {
    estimatedPrepTime = Math.ceil(estimatedPrepTime / 5) * 5;
  }

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
    prepTime: currentOrderPrepTime,
    estimatedPrepTime,
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
      estimatedPrepTime: order.estimatedPrepTime,
    });

    // Fetch fresh inventory quantities and broadcast to kiosks
    const itemIds = expandedItems.map((it) => it.id);
    const updatedInventory = await Inventory.find({ itemId: { $in: itemIds }, outletId });
    updatedInventory.forEach((rec) => {
      emitInventoryUpdate(outletId.toString(), {
        itemId: rec.itemId.toString(),
        quantity: rec.quantity,
        status: rec.status,
      });

      // Fire low-stock alert if the new quantity is at or below the threshold
      if (rec.lowStockThreshold != null && rec.quantity <= rec.lowStockThreshold) {
        emitLowStockAlert(outletId.toString(), {
          itemId: rec.itemId.toString(),
          itemName: expandedItems.find((it) => it.id === rec.itemId.toString())?.name ?? rec.itemId.toString(),
          quantity: rec.quantity,
          lowStockThreshold: rec.lowStockThreshold,
        });
      }
    });

    console.log(
      `[SQS consumer] Order ${order._id} completed successfully — correlationId: ${correlationId}`
    );
  } else {
    // Payment failed — restore the component items' inventory and mark order Failed
    await restoreInventory(expandedItems, outletId);
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
