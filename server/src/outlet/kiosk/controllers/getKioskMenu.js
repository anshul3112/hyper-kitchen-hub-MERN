import { Items } from "../../../items/models/itemModel.js";
import { Category } from "../../../items/models/categoryModel.js";
import { Filters } from "../../../items/models/filterModel.js";
import { Inventory } from "../../../items/models/inventoryModel.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

/**
 * GET /api/v1/kiosks/menu
 * Returns menu (categories + filters + items) for the kiosk's tenant.
 * Requires verifyKioskJWT — uses req.kiosk instead of req.user.
 */
export const getKioskMenu = asyncHandler(async (req, res) => {
  const kiosk = req.kiosk;

  if (!kiosk.tenant || !kiosk.tenant.tenantId) {
    throw new ApiError(400, "Tenant information not found in kiosk data");
  }

  const tenantId = kiosk.tenant.tenantId;
  const outletId = kiosk.outlet.outletId;

  const [categoriesData, filtersData, itemsData, inventoryData] = await Promise.all([
    Category.find({ tenantId })
      .select("_id name status imageUrl createdAt")
      .sort({ createdAt: -1 }),
    Filters.find({ tenantId })
      .select("_id name isActive imageUrl createdAt")
      .sort({ createdAt: -1 }),
    Items.find({ tenantId, status: true })
      .select("-__v")
      .sort({ createdAt: -1 }),
    Inventory.find({ outletId }).select("itemId status").lean(),
  ]);

  // Build a set of itemIds that are explicitly disabled at the outlet level
  const disabledItemIds = new Set(
    inventoryData
      .filter((rec) => rec.status === false)
      .map((rec) => rec.itemId.toString())
  );

  const categoryMap = new Map(categoriesData.map((c) => [c._id.toString(), c]));
  const filterMap = new Map(filtersData.map((f) => [f._id.toString(), f]));

  const itemsWithRelations = itemsData
    .filter((item) => !disabledItemIds.has(item._id.toString()))
    .map((item) => {
      const itemObj = item.toObject();
      itemObj.categories = item.categories
        .map((catId) => categoryMap.get(catId.toString()))
        .filter(Boolean);
      itemObj.filters = item.filters
        .map((filterId) => filterMap.get(filterId.toString()))
        .filter(Boolean);
      return itemObj;
    });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        categories: categoriesData.filter((c) => c.status),
        filters: filtersData.filter((f) => f.isActive),
        items: itemsWithRelations,
      },
      "Kiosk menu fetched successfully"
    )
  );
});
