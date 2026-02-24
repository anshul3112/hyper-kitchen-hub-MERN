import mongoose, { Schema } from "mongoose";

const displaySchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    outlet: {
      outletId: {
        type: Schema.Types.ObjectId,
        ref: "Outlet",
        required: true,
      },
      outletName: {
        type: String,
        required: true,
      },
    },
    tenant: {
      tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: true,
      },
      tenantName: {
        type: String,
        required: true,
      },
    },
    loginCode: {
      type: String,
      default: null,
    },
    loginCodeExpiresAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: Date,
    role: {
      type: String,
      default: "Display",
    },
  },
  { timestamps: true }
);

displaySchema.index({ "outlet.outletId": 1 });
displaySchema.index({ "outlet.outletId": 1, number: 1 }, { unique: true });
displaySchema.index({ loginCode: 1, loginCodeExpiresAt: 1 });

export const OrderDisplay = mongoose.model("OrderDisplay", displaySchema);
