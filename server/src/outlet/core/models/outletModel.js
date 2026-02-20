import mongoose, { Schema } from 'mongoose';

const outletSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
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
  imageUrl: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  location: {
    type: Object
  },
  status: {
    type: Boolean,
    default: true
  },
  timings: {
    type: Object
  },
  tenant: {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true
    },
    tenantName: {
      type: String,
      required: true
    }
  },
  orderNumber: {
    type: Number,
    default: 0
  },
  owner: {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    name: {
      type: String
    }
  }
}, { timestamps: true });

export const Outlet = mongoose.model("Outlet", outletSchema);
