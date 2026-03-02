import { Items } from "../models/itemModel.js";
import { Category } from "../models/categoryModel.js";
import { Filters } from "../models/filterModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { withPresignedUrl, withPresignedUrls } from "../../utils/s3.js";
import { getMenuCache, setMenuCache } from "../../utils/cache.js";

/**
 * GET /api/v1/items/menu/all
 * Return all categories, filters, and items for the caller's tenant in one response.
 * Allowed roles: kiosk, outletAdmin, tenantAdmin.
 */
export const getMenuDetails = asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if user has tenant information
  if (!user.tenant || !user.tenant.tenantId) {
    throw new ApiError(400, "Tenant information not found in user data");
  }

  // Check if user role is allowed
  const allowedRoles = ["kiosk", "outletAdmin", "tenantAdmin"];
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, "User role not allowed to view menu");
  }

  const tenantId = user.tenant.tenantId;

  // ── Cache read ────────────────────────────────────────────────────────────
  const cached = await getMenuCache(tenantId);
  if (cached) {
    return res.status(200).json(
      new ApiResponse(200, cached, "Menu details fetched successfully (cached)")
    );
  }

  const [categoriesData, filtersData, itemsData] = await Promise.all([
    Category.find({ tenantId }).select('_id name status imageKey createdAt').sort({ createdAt: -1 }),
    Filters.find({ tenantId }).select('_id name isActive imageKey createdAt').sort({ createdAt: -1 }),
    Items.find({ tenantId }).select('-__v').sort({ createdAt: -1 })
  ]);

  const categoryMap = new Map(categoriesData.map(c => [c._id.toString(), c]));
  const filterMap = new Map(filtersData.map(f => [f._id.toString(), f]));

  // Merge populated data into items
  const rawItemsWithRelations = itemsData.map(item => {
    const itemObj = item.toObject();
    itemObj.category = item.category
      ? (categoryMap.get(item.category.toString()) ?? null)
      : null;
    itemObj.filters = item.filters
      .map(filterId => filterMap.get(filterId.toString()))
      .filter(filt => filt !== undefined);
    return itemObj;
  });

  // Inject presigned URLs for all images
  const [categoriesWithUrls, filtersWithUrls, itemsWithRelations] = await Promise.all([
    withPresignedUrls(categoriesData.map(c => c.toObject ? c.toObject() : c)),
    withPresignedUrls(filtersData.map(f => f.toObject ? f.toObject() : f)),
    withPresignedUrls(rawItemsWithRelations),
  ]);

  const menuDetails = {
    categories: categoriesWithUrls,
    filters: filtersWithUrls,
    items: itemsWithRelations,
    summary: {
      totalCategories: categoriesData.length,
      totalFilters: filtersData.length,
      totalItems: itemsWithRelations.length,
      activeItems: itemsWithRelations.filter(item => item.status === true).length,
      inactiveItems: itemsWithRelations.filter(item => item.status === false).length
    }
  };

  // ── Cache write ───────────────────────────────────────────────────────────
  await setMenuCache(tenantId, menuDetails);

  return res.status(200).json(
    new ApiResponse(200, menuDetails, "Menu details fetched successfully")
  );
});
