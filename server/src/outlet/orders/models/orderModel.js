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
    /**
     * Arbitrary payment details object (e.g. { name, upiId } for UPI payments).
     * Using Mixed so the schema can accept any future payment provider's structure.
     */
    paymentDetails: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

// outlet lookup (fetch orders for an outlet)
ordersSchema.index({ outletId: 1 });
// tenant lookup (fetch orders for a tenant)
ordersSchema.index({ tenantId: 1 });
// orders by outlet sorted by date (order history)
ordersSchema.index({ outletId: 1, date: -1 });
// status filter (kitchen/billing views)
ordersSchema.index({ orderStatus: 1 });

export const Orders = mongoose.model("Orders", ordersSchema);
