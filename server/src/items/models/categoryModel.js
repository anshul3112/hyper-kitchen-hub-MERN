import mongoose, { Schema } from 'mongoose';

/**
 * name is stored as a multilingual object: { en: "Starters", hi: "स्टार्टर" }
 * English (en) is always required; other language fields are optional.
 * Using Schema.Types.Mixed keeps the schema open for new languages without
 * model changes — just add the language to SUPPORTED_LANGUAGES in constants.js.
 */
const categorySchema = new Schema({
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
  // imageUrl: { type: String, trim: true }, // Cloudinary URL — replaced by S3 key
  imageKey: {
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
// duplicate English-name check per tenant
categorySchema.index({ 'name.en': 1, tenantId: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
