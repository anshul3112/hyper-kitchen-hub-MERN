import { Inventory } from "../models/inventoryModel.js";
import { Items } from "../models/itemModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

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

// Verify item belongs to the same tenant as the outlet admin
const validateItem = async (itemId, tenantId) => {
  const item = await Items.findOne({ _id: itemId, tenantId });
  if (!item) throw new ApiError(404, "Item not found or does not belong to your tenant");
  return item;
};

// ─── GET /api/v1/items/inventory ─────────────────────────────────────────────
// Returns all inventory records for the caller's outlet, joined with item details
export const getOutletInventory = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);

  const inventory = await Inventory.find({ outletId }).sort({ updatedAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, inventory, "Inventory fetched successfully")
  );
});

// ─── PUT /api/v1/items/inventory/:itemId ─────────────────────────────────────
// Upsert: create or fully replace the inventory record for an item at this outlet
// Body: { price, quantity }
export const upsertInventoryItem = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { price, quantity } = req.body;

  if (price === undefined || price === null) throw new ApiError(400, "price is required");
  if (quantity === undefined || quantity === null) throw new ApiError(400, "quantity is required");
  if (Number(price) < 0) throw new ApiError(400, "price must be non-negative");
  if (Number(quantity) < 0) throw new ApiError(400, "quantity must be non-negative");

  await validateItem(itemId, tenantId);

  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    { price: Number(price), quantity: Number(quantity), editedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, record, "Inventory updated successfully")
  );
});

// ─── PATCH /api/v1/items/inventory/:itemId/price ─────────────────────────────
// Change price only for an item at this outlet
// Body: { price }
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

  return res.status(200).json(
    new ApiResponse(200, record, "Price updated successfully")
  );
});

// ─── PATCH /api/v1/items/inventory/:itemId/quantity ────────────────────────────────
// Change quantity only for an item at this outlet
// Body: { quantity }
export const updateInventoryQuantity = asyncHandler(async (req, res) => {
  requireOutletAdmin(req.user);
  const outletId = resolveOutlet(req.user);
  const tenantId = req.user.tenant?.tenantId;
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) throw new ApiError(400, "quantity is required");
  if (Number(quantity) < 0) throw new ApiError(400, "quantity must be non-negative");

  await validateItem(itemId, tenantId);

  // qty-only patch: inventory record must already exist
  const record = await Inventory.findOneAndUpdate(
    { itemId, outletId },
    { quantity: Number(quantity), editedBy: req.user._id },
    { new: true }
  );

  if (!record) {
    throw new ApiError(
      404,
      "No inventory record found for this item. Set a price first using PUT /inventory/:itemId"
    );
  }

  return res.status(200).json(
    new ApiResponse(200, record, "Quantity updated successfully")
  );
});
