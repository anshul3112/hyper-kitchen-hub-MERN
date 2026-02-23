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
    type: Number,
    required: true
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
  }
}, { timestamps: true });

// unique record per item+outlet (upsert, price, quantity patches)
inventorySchema.index({ itemId: 1, outletId: 1 }, { unique: true });
// outlet lookup (getOutletInventory)
inventorySchema.index({ outletId: 1 });

export const Inventory = mongoose.model("Inventory", inventorySchema);
