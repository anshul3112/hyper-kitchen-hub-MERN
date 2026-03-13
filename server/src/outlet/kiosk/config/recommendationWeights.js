export const RECOMMENDATION_WEIGHTS = {
  maxReturnedItems: 10,
  sources: {
    adminSlot: {
      enabled: true,
      bias: 0.7,
    },
    outletTimeSlotFrequency: {
      enabled: true,
      bias: 0.3,
      limit: 10,
    },
  },
};
