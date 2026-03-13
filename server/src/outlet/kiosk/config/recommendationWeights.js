export const RECOMMENDATION_WEIGHTS = {
  maxReturnedItems: 10,
  sources: {
    adminSlot: {
      enabled: true,
      bias: 0.55,
    },
    outletTimeSlotFrequency: {
      enabled: true,
      bias: 0.25,
      limit: 10,
    },
    inventoryAware: {
      enabled: true,
      bias: 0.05,
      limit: 10,
      fallbackMinQty: 5,
    },
    marginBased: {
      enabled: true,
      bias: 0.2,
      limit: 10,
    },
  },
};
