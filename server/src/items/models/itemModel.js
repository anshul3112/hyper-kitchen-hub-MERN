import mongoose, { Schema } from 'mongoose';

//English (en) is required for name; other keys are optional.
const itemsSchema = new Schema({
  name: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: (v) =>
        v && typeof v === 'object' && typeof v.en === 'string' && v.en.trim().length > 0,
      message: 'English name (name.en) is required',
    },
  },
  description: {
    type: Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: Boolean,
    default: true
  },
  defaultAmount: {
    type: Number,
    required: true
  },
  filters: [{
    type: Schema.Types.ObjectId,
    ref: "Filters"
  }],
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  imageKey: {
    type: String,
    trim: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  },
  type: {
    type: String,
    enum: ['single', 'combo'],
    default: 'single'
  },
  comboItems: [{
    item: { type: Schema.Types.ObjectId, ref: 'Items', required: true },
    quantity: { type: Number, default: 1, min: 1 }
  }],
  /**
   * Minimum number of comboItems that must be present in the cart before
   * the kiosk shows an upgrade suggestion.
   */
  minMatchCount: {
    type: Number,
    default: 1,
    min: 1
  }
}, { timestamps: true });

// tenant lookup (getItems)
itemsSchema.index({ tenantId: 1 });
// duplicate English-name check per tenant
itemsSchema.index({ 'name.en': 1, tenantId: 1 }, { unique: true });
// category lookup (getItemsByCategory)
itemsSchema.index({ category: 1, tenantId: 1 });

export const Items = mongoose.model("Items", itemsSchema);
