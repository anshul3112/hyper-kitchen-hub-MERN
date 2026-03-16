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
  status: {
    type: Boolean,
    default: true
  },
  orderType: {
    type: String,
    enum: ['dineIn', 'takeAway', 'both'],
    default: 'both'
  },
  lowStockThreshold: {
    type: Number,
    default: null,
    min: 0
  },
  baseCost: {
    type: Number,
    default: null,
    min: 0
  },
  prepTime: {
    type: Number,
    default: 3,
    min: 0
  },

  prioritySlots: {
    type: [{
      startDate: { type: Date, required: true },
      endDate:   { type: Date, required: true },
      startTime: { type: Number, required: true, min: 0, max: 1440 },
      endTime:   { type: Number, required: true, min: 0, max: 1440 },
      price:     { type: Number, required: true, min: 0 },
    }],
    default: [],
    validate: {
      validator: (v) => v.length <= 10,
      message: "prioritySlots cannot exceed 10 entries",
    },
  },

  priceSlots: {
    type: [{
      days:      { type: [{ type: Number, min: 0, max: 6 }], required: true },
      startTime: { type: Number, required: true, min: 0, max: 1440 },
      endTime:   { type: Number, required: true, min: 0, max: 1440 },
      price:     { type: Number, required: true, min: 0 },
    }],
    default: [],
    validate: {
      validator: (v) => v.length <= 10,
      message: "priceSlots cannot exceed 10 entries",
    },
  },

  availabilitySlots: {
    type: [{
      days:      { type: [{ type: Number, min: 0, max: 6 }], required: true },
      startTime: { type: Number, required: true, min: 0, max: 1440 },
      endTime:   { type: Number, required: true, min: 0, max: 1440 },
    }],
    default: [],
    validate: {
      validator: (v) => v.length <= 10,
      message: "availabilitySlots cannot exceed 10 entries",
    },
  },
}, { timestamps: true });

inventorySchema.index({ itemId: 1, outletId: 1 }, { unique: true });
inventorySchema.index({ outletId: 1 });

export const Inventory = mongoose.model("Inventory", inventorySchema);
