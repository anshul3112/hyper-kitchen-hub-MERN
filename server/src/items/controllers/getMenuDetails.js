import { Items } from "../models/itemModel.js";
import { Category } from "../models/categoryModel.js";
import { Filters } from "../models/filterModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Get complete menu details (categories, filters, items)
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

  const [categoriesData, filtersData, itemsData] = await Promise.all([
    Category.find({ tenantId }).select('_id name status imageUrl createdAt').sort({ createdAt: -1 }),
    Filters.find({ tenantId }).select('_id name isActive imageUrl createdAt').sort({ createdAt: -1 }),
    Items.find({ tenantId }).select('-__v').sort({ createdAt: -1 })
  ]);

  const categoryMap = new Map(categoriesData.map(c => [c._id.toString(), c]));
  const filterMap = new Map(filtersData.map(f => [f._id.toString(), f]));

  // Merge populated data into items
  const itemsWithRelations = itemsData.map(item => {
    const itemObj = item.toObject();
    itemObj.category = item.category
      ? (categoryMap.get(item.category.toString()) ?? null)
      : null;
    itemObj.filters = item.filters
      .map(filterId => filterMap.get(filterId.toString()))
      .filter(filt => filt !== undefined);
    return itemObj;
  });

  const menuDetails = {
    categories: categoriesData,
    filters: filtersData,
    items: itemsWithRelations,
    summary: {
      totalCategories: categoriesData.length,
      totalFilters: filtersData.length,
      totalItems: itemsWithRelations.length,
      activeItems: itemsWithRelations.filter(item => item.status === true).length,
      inactiveItems: itemsWithRelations.filter(item => item.status === false).length
    }
  };

  return res.status(200).json(
    new ApiResponse(200, menuDetails, "Menu details fetched successfully")
  );
});
