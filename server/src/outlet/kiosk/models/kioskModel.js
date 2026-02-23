import mongoose, { Schema } from 'mongoose';

const kioskSchema = new Schema({
  
code: {
  type:String,
  required:true,
  unique:true,
  index:true
},
status: {
  type:String,
  enum:["ACTIVE","OFFLINE","MAINTENANCE","DISABLED"],
  default:"ACTIVE"
},

lastLoginAt: Date,
lastHeartbeatAt: Date,
lastSyncAt: Date,

isActive: { 
  type:Boolean,
   default:true 
  },
  outlet: {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: true
    },
    outletName: {
      type: String,
      required: true
    }
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
  number: {
    type: Number,
    required: true
  },
  loginCode: {
    type: String,
    default: null
  },
  loginCodeExpiresAt: {
    type: Date,
    default: null
  },
  images: {
    type: Array
  },
  role: {
    type: String,
    default: "Kiosk"
  }
}, { timestamps: true });

// outlet lookup (getAllKiosks, auto-increment)
kioskSchema.index({ "outlet.outletId": 1 });
// unique kiosk number per outlet
kioskSchema.index({ "outlet.outletId": 1, number: 1 }, { unique: true });
// login-code lookup (loginKiosk)
kioskSchema.index({ loginCode: 1, loginCodeExpiresAt: 1 });

export const Kiosk = mongoose.model("Kiosk", kioskSchema);
