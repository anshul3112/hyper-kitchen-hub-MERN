import { Items } from "../../../items/models/itemModel.js";
import { Category } from "../../../items/models/categoryModel.js";
import { Filters } from "../../../items/models/filterModel.js";
import { Inventory } from "../../../items/models/inventoryModel.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { withPresignedUrls } from "../../../utils/s3.js";
import { resolveSchedule } from "../../utils/resolveSchedule.js";

/**
 * GET /api/v1/kiosks/menu
 * Returns menu (categories + filters + items) for the kiosk's tenant.
 * Requires verifyKioskJWT — uses req.kiosk instead of req.user.
 *
 * Items are excluded when:
 *   a) inventory.status === false  (admin-disabled)
 *   b) A schedule availability slot resolves to false at the current time
 *      (schedule-disabled — same UX as admin-disabled; hidden completely)
 */
export const getKioskMenu = asyncHandler(async (req, res) => {
  const kiosk = req.kiosk;

  if (!kiosk.tenant || !kiosk.tenant.tenantId) {
    throw new ApiError(400, "Tenant information not found in kiosk data");
  }

  const tenantId = kiosk.tenant.tenantId;
  const outletId = kiosk.outlet.outletId;
  const now = new Date();

  const [categoriesData, filtersData, itemsData, inventoryData] = await Promise.all([
    Category.find({ tenantId })
      .select("_id name status imageKey createdAt")
      .sort({ createdAt: -1 }),
    Filters.find({ tenantId })
      .select("_id name isActive imageKey createdAt")
      .sort({ createdAt: -1 }),
    Items.find({ tenantId, status: true })
      .select("-__v")
      .sort({ createdAt: -1 }),
    Inventory.find({ outletId })
      .select("itemId status prioritySlots priceSlots availabilitySlots")
      .lean(),
  ]);

  // Build a map keyed by itemId string for O(1) lookups
  const inventoryMap = new Map(
    inventoryData.map((rec) => [rec.itemId.toString(), rec])
  );

  // Collect itemIds to exclude:
  //   1. admin-disabled (status === false)
  //   2. schedule-disabled (resolveSchedule returns isAvailable === false)
  const excludedItemIds = new Set();
  for (const rec of inventoryData) {
    const idStr = rec.itemId.toString();
    if (rec.status === false) {
      excludedItemIds.add(idStr);
      continue;
    }
    const { isAvailable } = resolveSchedule(rec, now);
    if (isAvailable === false) {
      excludedItemIds.add(idStr);
    }
  }

  const categoryMap = new Map(categoriesData.map((c) => [c._id.toString(), c]));
  const filterMap = new Map(filtersData.map((f) => [f._id.toString(), f]));

  const itemsWithRelations = itemsData
    .filter((item) => !excludedItemIds.has(item._id.toString()))
    .map((item) => {
      const itemObj = item.toObject();
      itemObj.category = item.category
        ? (categoryMap.get(item.category.toString()) ?? null)
        : null;
      itemObj.filters = item.filters
        .map((filterId) => filterMap.get(filterId.toString()))
        .filter(Boolean);
      return itemObj;
    });

  // Inject presigned URLs for all images
  const activeCats = categoriesData.filter((c) => c.status).map(c => c.toObject ? c.toObject() : c);
  const activeFils = filtersData.filter((f) => f.isActive).map(f => f.toObject ? f.toObject() : f);

  const [categoriesWithUrls, filtersWithUrls, itemsWithUrls] = await Promise.all([
    withPresignedUrls(activeCats),
    withPresignedUrls(activeFils),
    withPresignedUrls(itemsWithRelations),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        categories: categoriesWithUrls,
        filters: filtersWithUrls,
        items: itemsWithUrls,
      },
      "Kiosk menu fetched successfully"
    )
  );
});
