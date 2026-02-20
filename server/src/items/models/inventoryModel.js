import mongoose, { Schema } from 'mongoose';

const inventorySchema = new Schema({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: "Items",
    required: true
  },
  qty: {
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

export const Inventory = mongoose.model("Inventory", inventorySchema);
