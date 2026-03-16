import mongoose, { Schema } from 'mongoose';

//English (en) is always required; other language fields are optional.
const filterSchema = new Schema({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true
  },
  name: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: (v) =>
        v && typeof v === 'object' && typeof v.en === 'string' && v.en.trim().length > 0,
      message: 'English name (name.en) is required',
    },
  },
  imageKey: {
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
// duplicate English-name check per tenant
filterSchema.index({ 'name.en': 1, tenantId: 1 }, { unique: true });

export const Filters = mongoose.model("Filters", filterSchema);
