import mongoose, { Schema } from 'mongoose';

const filterSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  },
  name: {
    type: String,
    trim: true,
    required: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// tenant lookup (getFilters)
filterSchema.index({ tenantId: 1 });
// duplicate-name check per tenant
filterSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export const Filters = mongoose.model("Filters", filterSchema);
