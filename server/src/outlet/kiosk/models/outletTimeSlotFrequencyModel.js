import mongoose, { Schema } from "mongoose";

function buildEmptyFrequency() {
  const freq = {};
  for (let hour = 0; hour < 24; hour += 1) {
    freq[String(hour)] = {};
  }
  return freq;
}

const outletTimeSlotFrequencySchema = new Schema(
  {
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    // Shape: { "0": { itemId: count }, ..., "23": { itemId: count } }
    frequency: {
      type: Schema.Types.Mixed,
      default: buildEmptyFrequency,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

outletTimeSlotFrequencySchema.index({ outletId: 1, tenantId: 1 }, { unique: true });

export function createEmptyFrequency() {
  return buildEmptyFrequency();
}

export const OutletTimeSlotFrequency = mongoose.model(
  "OutletTimeSlotFrequency",
  outletTimeSlotFrequencySchema,
);
