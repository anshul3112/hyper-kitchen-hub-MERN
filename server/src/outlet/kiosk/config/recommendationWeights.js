export const RECOMMENDATION_WEIGHTS = {
  maxReturnedItems: 10,
  sources: {
    adminSlot: {
      enabled: false,
      bias: 0.55,
    },
    outletTimeSlotFrequency: {
      enabled: false,
      bias: 0.25,
      limit: 10,
    },
    inventoryAware: {
      enabled: false,
      bias: 0.2,
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
