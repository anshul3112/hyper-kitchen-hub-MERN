import { Inventory } from "../models/inventoryModel.js";
import { Items } from "../models/itemModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { emitInventoryUpdate, emitLowStockAlert } from "../../utils/socket.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const requireOutletAdmin = (user) => {
  if (user.role !== "outletAdmin") {
    throw new ApiError(403, "Only outlet admins can manage outlet inventory");
  }
};

const resolveOutlet = (user) => {
  const outletId = user.outlet?.outletId;
  if (!outletId) throw new ApiError(400, "Outlet information not found in user data");
  return outletId;
};

/**
 * Resolve outletId from either a normal user (outletAdmin) or a kiosk device.
 * Used for read-only inventory access shared between both roles.
 */
const resolveOutletForRead = (req) => {
  // Kiosk JWT path — req.kiosk is set by verifyKioskJWT
  if (req.kiosk) {
    const outletId = req.kiosk.outlet?.outletId;
    if (!outletId) throw new ApiError(400, "Outlet information not found in kiosk data");
    return outletId;
  }
  // Normal user path — outletAdmin
  requireOutletAdmin(req.user);
  return resolveOutlet(req.user);
};

// Verify item belongs to the same tenant as the outlet admin
const validateItem = async (itemId, tenantId) => {
  const item = await Items.findOne({ _id: itemId, tenantId });
  if (!item) throw new ApiError(404, "Item not found or does not belong to your tenant");
  return item;
};

/**
 * After any write that changes `quantity`, check whether the new quantity has
 * fallen to or below the configured lowStockThreshold.  If so, fire a socket
 * alert to every socket in the outlet room (i.e. the outlet admin dashboard).
 * itemName is optional — pass it when you already have it to avoid an extra DB round-trip.
 */
const checkAndEmitLowStock = async (record, outletId, itemName) => {
  if (record.lowStockThreshold == null) return;
  if (record.quantity > record.lowStockThreshold) return;

  let name = itemName;
  if (!name) {
    const item = await Items.findById(record.itemId).select("name").lean();
    name = item?.name ?? record.itemId.toString();
  }

  emitLowStockAlert(outletId.toString(), {
    itemId: record.itemId.toString(),
    itemName: name,
    quantity: record.quantity,
    lowStockThreshold: record.lowStockThreshold,
  });
};

/**
 * GET /api/v1/items/inventory
 * Returns all inventory records for the caller's outlet.
 * Accessible by outletAdmin (verifyJWT) and kiosk device (verifyKioskJWT).
 */
export const getOutletInventory = asyncHandler(async (req, res) => {
  const outletId = resolveOutletForRead(req);

  const inventory = await Inventory.find({ outletId }).sort({ updatedAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, inventory, "Inventory fetched successfully")
  );
});

/**
 * PUT /api/v1/items/inventory/:itemId
 * Upsert: create or fully replace the inventory record for an item at this outlet.
 * Body: { price, quantity }
 */
export const upsertInventoryItem = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { price, quantity, orderType } = req.body;

  if (price === undefined || price === null) throw new ApiError(400, "price is required");
  if (quantity === undefined || quantity === null) throw new ApiError(400, "quantity is required");
  if (Number(price) < 0) throw new ApiError(400, "price must be non-negative");
  if (Number(quantity) < 0) throw new ApiError(400, "quantity must be non-negative");
  if (orderType !== undefined && !['dineIn', 'takeAway', 'both'].includes(orderType)) {
    throw new ApiError(400, "orderType must be one of: dineIn, takeAway, both");
  }

  await validateItem(itemId, tenantId);

  const updateFields = { price: Number(price), quantity: Number(quantity), editedBy: req.user._id };
  if (orderType !== undefined) updateFields.orderType = orderType;

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    updateFields,
    { new: true, upsert: true, runValidators: true }
  );

  emitInventoryUpdate(outletId.toString(), {
    itemId: itemId.toString(),
    price: record.price ?? null,
    quantity: record.quantity,
    status: record.status,
    orderType: record.orderType,
  });

  // Fire low-stock alert if quantity is at or below the configured threshold
  await checkAndEmitLowStock(record, outletId);

  return res.status(200).json(
    new ApiResponse(200, record, "Inventory updated successfully")
  );
});

// ─── PATCH /api/v1/items/inventory/:itemId/price ─────────────────────────────
/**
 * PATCH /api/v1/items/inventory/:itemId/price
 * Change price only for an item at this outlet.
 * Body: { price }
 */
export const updateInventoryPrice = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { price } = req.body;

  if (price === undefined || price === null) throw new ApiError(400, "price is required");
  if (Number(price) < 0) throw new ApiError(400, "price must be non-negative");

  await validateItem(itemId, tenantId);

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    { price: Number(price), editedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );

  emitInventoryUpdate(outletId.toString(), {
    itemId: itemId.toString(),
    price: record.price ?? null,
    quantity: record.quantity,
    status: record.status,
    orderType: record.orderType,
  });

  return res.status(200).json(
    new ApiResponse(200, record, "Price updated successfully")
  );
});

/**
 * PATCH /api/v1/items/inventory/:itemId/quantity
 * Change quantity only for an item at this outlet.
 * Body: { quantity }
 */
export const updateInventoryQuantity = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) throw new ApiError(400, "quantity is required");
  if (Number(quantity) < 0) throw new ApiError(400, "quantity must be non-negative");

  await validateItem(itemId, tenantId);

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    { quantity: Number(quantity), editedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );

  emitInventoryUpdate(outletId.toString(), {
    itemId: itemId.toString(),
    price: record.price ?? null,
    quantity: record.quantity,
    status: record.status,
    orderType: record.orderType,
  });

  // Fire low-stock alert if quantity is at or below the configured threshold
  await checkAndEmitLowStock(record, outletId);

  return res.status(200).json(
    new ApiResponse(200, record, "Quantity updated successfully")
  );
});

/**
 * PATCH /api/v1/items/inventory/:itemId/status
 * Toggle the outlet-level status (enabled/disabled) for an item.
 * Body: { status: boolean }
 */
export const toggleInventoryStatus = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { status } = req.body;

  if (status === undefined || status === null) throw new ApiError(400, "status (boolean) is required");
  if (typeof status !== "boolean") throw new ApiError(400, "status must be a boolean");

  await validateItem(itemId, tenantId);
  const existing = await Inventory.findOne({ itemId, outletId });
  const qtyToUse = existing ? existing.quantity : 0;
  // Only carry price if one has already been set; do not auto-fill defaultAmount
  const updateFields = { status, quantity: qtyToUse, editedBy: req.user._id };
  if (existing?.price != null) updateFields.price = existing.price;

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    updateFields,
    { new: true, upsert: true, runValidators: true }
  );

  emitInventoryUpdate(outletId.toString(), {
    itemId: itemId.toString(),
    price: record.price ?? null,
    quantity: record.quantity,
    status: record.status,
    orderType: record.orderType,
  });

  return res.status(200).json(
    new ApiResponse(200, record, `Item ${status ? "enabled" : "disabled"} at outlet level`)
  );
});

/**
 * PATCH /api/v1/items/inventory/:itemId/orderType
 * Change the order-type availability (dineIn / takeAway / both) for an item at this outlet.
 * Body: { orderType: 'dineIn' | 'takeAway' | 'both' }
 */
export const updateInventoryOrderType = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { orderType } = req.body;

  if (!orderType) throw new ApiError(400, "orderType is required");
  if (!['dineIn', 'takeAway', 'both'].includes(orderType)) {
    throw new ApiError(400, "orderType must be one of: dineIn, takeAway, both");
  }

  await validateItem(itemId, tenantId);

  const existing = await Inventory.findOne({ itemId, outletId });
  const updateFields = { orderType, editedBy: req.user._id };
  // preserve existing quantity so upsert doesn't reset it to 0
  if (!existing) updateFields.quantity = 0;

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    updateFields,
    { new: true, upsert: true, runValidators: true }
  );

  emitInventoryUpdate(outletId.toString(), {
    itemId: itemId.toString(),
    price: record.price ?? null,
    quantity: record.quantity,
    status: record.status,
    orderType: record.orderType,
  });

  return res.status(200).json(
    new ApiResponse(200, record, "Order type updated successfully")
  );
});

/**
 * PATCH /api/v1/items/inventory/:itemId/threshold
 * Set or clear the low-stock threshold for an item at this outlet.
 * Body: { lowStockThreshold: number | null }
 *   - Pass a non-negative number to enable alerts when quantity <= threshold.
 *   - Pass null to disable the alert for this item.
 */
export const updateInventoryThreshold = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { lowStockThreshold } = req.body;

  if (lowStockThreshold !== null && lowStockThreshold !== undefined) {
    if (typeof lowStockThreshold !== "number" || lowStockThreshold < 0) {
      throw new ApiError(400, "lowStockThreshold must be a non-negative number or null");
    }
  }

  await validateItem(itemId, tenantId);

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    { lowStockThreshold: lowStockThreshold ?? null, editedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );

  // Immediately check if current quantity already breaches the new threshold
  await checkAndEmitLowStock(record, outletId);

  return res.status(200).json(
    new ApiResponse(
      200,
      record,
      lowStockThreshold == null
        ? "Low-stock threshold cleared"
        : `Low-stock threshold set to ${lowStockThreshold}`
    )
  );
});
