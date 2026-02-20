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
  categories: [{
    type: Schema.Types.ObjectId,
    ref: "Category"
  }],
  imageUrl: {
    type: String,
    trim: true
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  }
}, { timestamps: true });

export const Items = mongoose.model("Items", itemsSchema);
