import mongoose, { Schema } from 'mongoose';

const categorySchema = new Schema({
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
  status: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// tenant lookup (getCategories)
categorySchema.index({ tenantId: 1 });
// duplicate-name check per tenant
categorySchema.index({ name: 1, tenantId: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
