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
      unique: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
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

export function createEmptyFrequency() {
  return buildEmptyFrequency();
}

export const OutletTimeSlotFrequency = mongoose.model(
  "OutletTimeSlotFrequency",
  outletTimeSlotFrequencySchema,
);
