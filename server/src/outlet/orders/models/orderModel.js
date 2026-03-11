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
    /**
     * Arbitrary payment details object (e.g. { name, upiId } for UPI payments).
     * Using Mixed so the schema can accept any future payment provider's structure.
     */
    paymentDetails: {
      type: Schema.Types.Mixed,
      default: null,
    },
    // Maximum prepTime (minutes) among all items in this order.
    // Derived from the Inventory.prepTime of each cart item at the moment of order creation.
    prepTime: {
      type: Number,
      default: 0,
    },
    // Estimated total wait time (minutes) for this order:
    //   estimatedPrepTime = queueDelay (sum of prepTime of all ongoing orders ahead) + prepTime
    estimatedPrepTime: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// outlet lookup (fetch orders for an outlet)
ordersSchema.index({ "outlet.outletId": 1 });
// tenant lookup (fetch orders for a tenant)
ordersSchema.index({ "tenant.tenantId": 1 });
// orders by outlet sorted by date (order history)
ordersSchema.index({ "outlet.outletId": 1, date: -1 });
// status filter (kitchen/billing views)
ordersSchema.index({ orderStatus: 1 });

export const Orders = mongoose.model("Orders", ordersSchema);
