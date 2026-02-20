import mongoose, { Schema } from "mongoose";

const ordersSchema = new Schema(
  {
    orderNo: {
      type: Number,
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
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Failed", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

export const Orders = mongoose.model("Orders", ordersSchema);
