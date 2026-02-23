import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  password: {
    type: String,
    trim: true,
    required: true
  },
  email: {
    type: String,
    trim: true,
    required: true,
  },
  role: {
    type: String,
    enum: ["superAdmin","outletAdmin","outletOwner","tenantAdmin","tenantOwner","kitchenStaff","billingStaff"],
    default: "outletAdmin"
  },
  status: {
    type: Boolean,
    default: true
  },
  outlet: {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
    },
    outletName: {
      type: String,
    }
  },
  tenant: {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
    },
    tenantName: {
      type: String,
    }
  },
  phoneNumber: {
    type: String,
    trim: true
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if(!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 9);
});

userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.index({ email: 1 }, { unique: true });
// role filter (role-based queries)
userSchema.index({ role: 1 });
// tenant lookup (getUsersByTenant)
userSchema.index({ "tenant.tenantId": 1 });
// outlet lookup (getOutletAdmins)
userSchema.index({ "outlet.outletId": 1 });

export const User = mongoose.model("User", userSchema);
