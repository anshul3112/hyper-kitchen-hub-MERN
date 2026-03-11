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
  },
  // estimated minutes the kitchen needs to prepare one serving of this item
  // outlet admin can override this per-item; default is 3 minutes
  // 0 = no prep needed (e.g. packaged drinks — served instantly)
  prepTime: {
    type: Number,
    default: 3,
    min: 0
  },

  // ── Schedule slots ────────────────────────────────────────────────────────
  // Times are stored as minutes-of-day (0 = 00:00, 1439 = 23:59).
  // endTime must always be > startTime (no midnight crossing).
  // Evaluation priority: prioritySlots > priceSlots > availabilitySlots.
  // Price and availability are resolved independently.
  // If no availabilitySlot's days include today → isAvailable = null
  // (falls back to inventory.status admin toggle).

  // Highest-priority overrides — used for special offers / event pricing.
  // When an active priority slot matches: item is always visible on kiosk
  // and the price comes from the slot (ignoring all other price slots).
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

  // Price change slots keyed to specific weekdays (0 = Sunday … 6 = Saturday).
  // Replaces weeklyPriceSlots + dailyPriceSlots — use days: [0,1,2,3,4,5,6] for every day.
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

  // Availability rules keyed to specific weekdays.
  // No enabled boolean — presence of a matching slot means the item is available;
  // absence of any slot matching today → fall back to inventory.status.
  // Use days: [0,1,2,3,4,5,6] + startTime=0 + endTime=1439 for always-available.
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

// unique record per item+outlet (upsert, price, quantity patches)
inventorySchema.index({ itemId: 1, outletId: 1 }, { unique: true });
// outlet lookup (getOutletInventory)
inventorySchema.index({ outletId: 1 });

export const Inventory = mongoose.model("Inventory", inventorySchema);
