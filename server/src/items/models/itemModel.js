import mongoose, { Schema } from 'mongoose';

/**
 * name and description are multilingual objects:
 *   name: { en: "Paneer Butter Masala", hi: "पनीर बटर मसाला" }
 *   description: { en: "Rich creamy curry", hi: "मलाईदार करी" }
 * English (en) is required for name; other keys are optional.
 */
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
  // imageUrl: { type: String, trim: true }, // Cloudinary URL — replaced by S3 key
  imageKey: {
    type: String,
    trim: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  },
  // ── Combo / Meal support ────────────────────────────────────────────────────
  /** 'single' = standard item; 'combo' = a meal that bundles other items */
  type: {
    type: String,
    enum: ['single', 'combo'],
    default: 'single'
  },
  /** Items that form this combo with their required quantities (only used when type = 'combo') */
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
