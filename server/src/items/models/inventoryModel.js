import mongoose, { Schema } from 'mongoose';

const inventorySchema = new Schema({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: "Items",
    required: true
  },
  quantity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number
    // optional: outlet admin may set quantity without specifying a price;
    // the item's defaultAmount is used as the display price in that case
  },
  outletId: {
    type: Schema.Types.ObjectId,
    ref: "Outlet",
    required: true
  },
  editedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // outlet-level enable/disable for this item (does not affect item master)
  status: {
    type: Boolean,
    default: true
  },
  // controls which order-type this item is available for at this outlet
  orderType: {
    type: String,
    enum: ['dineIn', 'takeAway', 'both'],
    default: 'both'
  },
  // outlet admin sets this; an alert fires when quantity drops to or below this value
  // null means the threshold feature is disabled for this item
  lowStockThreshold: {
    type: Number,
    default: null,
    min: 0
  }
}, { timestamps: true });

// unique record per item+outlet (upsert, price, quantity patches)
inventorySchema.index({ itemId: 1, outletId: 1 }, { unique: true });
// outlet lookup (getOutletInventory)
inventorySchema.index({ outletId: 1 });

export const Inventory = mongoose.model("Inventory", inventorySchema);
