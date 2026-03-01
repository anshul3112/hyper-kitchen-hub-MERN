import mongoose, { Schema } from 'mongoose';

const itemsSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  description: {
    type: String,
    trim: true
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
  }
}, { timestamps: true });

// tenant lookup (getItems)
itemsSchema.index({ tenantId: 1 });
// duplicate-name check per tenant
itemsSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export const Items = mongoose.model("Items", itemsSchema);
