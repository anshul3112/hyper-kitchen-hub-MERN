import { Items } from "../models/itemModel.js";
import { Category } from "../models/categoryModel.js";
import { Filters } from "../models/filterModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import mongoose from "mongoose";

// Add new item
export const addItem = asyncHandler(async (req, res) => {
  const { name, description, defaultAmount, category, filters = [], imageUrl } = req.body;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage items");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  // Validation
  if (!name || !name.trim()) {
    throw new ApiError(400, "Item name is required");
  }

  if (defaultAmount === undefined || defaultAmount === null) {
    throw new ApiError(400, "Default amount is required");
  }

  if (defaultAmount < 0) {
    throw new ApiError(400, "Default amount must be non-negative");
  }

  if (!category) {
    throw new ApiError(400, "category is required");
  }

  // Check if item already exists for this tenant
  const existingItem = await Items.findOne({
    name: name.trim(),
    tenantId
  });

  if (existingItem) {
    throw new ApiError(409, "Item with this name already exists in your organization");
  }

  // Validate category
  const validCategory = await Category.findOne({ _id: category, tenantId });
  if (!validCategory) {
    throw new ApiError(404, `Category with ID ${category} not found`);
  }

  // Validate filters if provided
  let validatedFilters = [];
  if (filters && filters.length > 0) {
    validatedFilters = await Promise.all(
      filters.map(async (filterId) => {
        const filter = await Filters.findOne({ _id: filterId, tenantId });
        if (!filter) {
          throw new ApiError(404, `Filter with ID ${filterId} not found`);
        }
        return filterId;
      })
    );
  }

  const item = new Items({
    name: name.trim(),
    description: description?.trim() || "",
    defaultAmount,
    category,
    filters: validatedFilters,
    imageUrl: imageUrl?.trim() || null,
    tenantId,
    status: true
  });

  await item.save();

  return res.status(201).json(
    new ApiResponse(201, item, "Item created successfully")
  );
});

// Get all items for a tenant
export const getItems = asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage items");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const items = await Items.find({ tenantId }).select("-__v");

  // Get all unique category and filter IDs
  const allCategoryIds = new Set();
  const allFilterIds = new Set();

  items.forEach(item => {
    if (item.category) allCategoryIds.add(item.category.toString());
    item.filters.forEach(filterId => allFilterIds.add(filterId.toString()));
  });

  // Fetch all categories and filters in parallel
  const [categoriesData, filtersData] = await Promise.all([
    Category.find({ _id: { $in: Array.from(allCategoryIds) } }).select('_id name status'),
    Filters.find({ _id: { $in: Array.from(allFilterIds) } }).select('_id name isActive')
  ]);

  // Create maps for quick lookup
  const categoryMap = new Map(categoriesData.map(c => [c._id.toString(), c]));
  const filterMap = new Map(filtersData.map(f => [f._id.toString(), f]));

  // Merge populated data into items
  const itemsWithRelations = items.map(item => {
    const itemObj = item.toObject();
    itemObj.category = item.category ? categoryMap.get(item.category.toString()) ?? null : null;
    itemObj.filters = item.filters
      .map(filterId => filterMap.get(filterId.toString()))
      .filter(Boolean);
    return itemObj;
  });

  return res.status(200).json(
    new ApiResponse(200, itemsWithRelations, "Items retrieved successfully")
  );
});

// Edit item
export const editItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { name, description, defaultAmount, category, filters, imageUrl, status } = req.body;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage items");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new ApiError(400, "Invalid item ID");
  }

  const item = await Items.findOne({ _id: itemId, tenantId });

  if (!item) {
    throw new ApiError(404, "Item not found");
  }

  // Check for duplicate name if changing it
  if (name && name !== item.name) {
    const existingItem = await Items.findOne({
      name: name.trim(),
      tenantId,
      _id: { $ne: itemId }
    });

    if (existingItem) {
      throw new ApiError(409, "Item with this name already exists");
    }

    item.name = name.trim();
  }

  if (description !== undefined) {
    item.description = description?.trim() || "";
  }

  if (defaultAmount !== undefined) {
    if (defaultAmount < 0) {
      throw new ApiError(400, "Default amount must be non-negative");
    }
    item.defaultAmount = defaultAmount;
  }

  // Update category if provided
  if (category !== undefined) {
    if (!category) {
      throw new ApiError(400, "category is required and cannot be removed");
    }
    const validCategory = await Category.findOne({ _id: category, tenantId });
    if (!validCategory) {
      throw new ApiError(404, `Category with ID ${category} not found`);
    }
    item.category = category;
  }

  // Update filters if provided
  if (filters !== undefined && Array.isArray(filters)) {
    if (filters.length > 0) {
      const validatedFilters = await Promise.all(
        filters.map(async (filterId) => {
          const filter = await Filters.findOne({ _id: filterId, tenantId });
          if (!filter) {
            throw new ApiError(404, `Filter with ID ${filterId} not found`);
          }
          return filterId;
        })
      );
      item.filters = validatedFilters;
    } else {
      item.filters = [];
    }
  }

  if (imageUrl !== undefined) {
    item.imageUrl = imageUrl?.trim() || null;
  }

  if (status !== undefined) {
    item.status = status;
  }

  await item.save();

  // Fetch category and filters separately
  const [categoryData, filtersData] = await Promise.all([
    Category.findById(item.category).select('_id name status'),
    Filters.find({ _id: { $in: item.filters } }).select('_id name isActive')
  ]);

  // Merge populated data
  const itemResponse = item.toObject();
  itemResponse.category = categoryData ?? null;
  itemResponse.filters = item.filters.map(filterId => filtersData.find(f => f._id.equals(filterId)) ?? null);

  return res.status(200).json(
    new ApiResponse(200, itemResponse, "Item updated successfully")
  );
});

// Delete item
export const deleteItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage items");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw new ApiError(400, "Invalid item ID");
  }

  const item = await Items.findOneAndDelete({ _id: itemId, tenantId });

  if (!item) {
    throw new ApiError(404, "Item not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Item deleted successfully")
  );
});
