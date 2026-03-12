import mongoose from "mongoose";

const recommendedItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Items",
      required: true,
    },
    priority: {
      type: Number,
      required: true,
      min: [1, "Priority must be a positive number"],
    },
  },
  { _id: false }
);

const recommendationSlotSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    // Minutes of day (0–1439). Same convention as inventory schedule slots.
    startTime: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
    },
    endTime: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    items: {
      type: [recommendedItemSchema],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: "A recommendation slot can have at most 10 items",
      },
    },
  },
  { timestamps: true }
);

recommendationSlotSchema.index({ outletId: 1, startTime: 1, endTime: 1 });

export const RecommendationSlot = mongoose.model(
  "RecommendationSlot",
  recommendationSlotSchema
);
