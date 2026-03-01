import mongoose, { Schema } from 'mongoose';

const tenantSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
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
  contacts: {
    email: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    }
  },
  location: {
    type: Object
  },
  address :{
    type: String,
    trim: true
  }
}, { timestamps: true });

tenantSchema.index({ name: 1 }, { unique: true });
tenantSchema.index({ "contacts.email": 1 }, { unique: true, sparse: true });
tenantSchema.index({ "contacts.phoneNumber": 1 }, { unique: true, sparse: true });

export const Tenant = mongoose.model("Tenant", tenantSchema);
