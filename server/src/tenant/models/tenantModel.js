import mongoose, { Schema } from 'mongoose';

const tenantSchema = new Schema({
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

export const Tenant = mongoose.model("Tenant", tenantSchema);
