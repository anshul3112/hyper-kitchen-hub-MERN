import mongoose, { Schema } from "mongoose";

const ordersSchema = new Schema(
  {
    orderNo: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    time: {
      type: String,
    },
    itemsCart: [
      {
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    tenant: {
      tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
      tenantName: { type: String, required: true },
    },
    outlet: {
      outletId: { type: Schema.Types.ObjectId, ref: "Outlet", required: true },
      outletName: { type: String, required: true },
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    orderStatus: {
      // this is order status not cooking status
      type: String,
      enum: ["Pending", "Processing", "Failed", "Completed"],
      default: "Pending",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["created", "received", "cooking", "prepared", "served"],
      default: "created",
    },
    paymentDetails: {
      type: Schema.Types.Mixed,
      default: null,
    },
    prepTime: {
      type: Number,
      default: 0,
    },
    estimatedPrepTime: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

ordersSchema.index({ "outlet.outletId": 1 });
ordersSchema.index({ "tenant.tenantId": 1, orderStatus: 1 });
ordersSchema.index({ "outlet.outletId": 1, orderStatus: 1 });

export const Orders = mongoose.model("Orders", ordersSchema);
