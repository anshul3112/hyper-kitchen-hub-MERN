import { Category } from "../models/categoryModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { withPresignedUrls, withPresignedUrl } from "../../utils/s3.js";
import { parseDuplicateKeyError } from "../../utils/mongoError.js";
import { invalidateMenuCache } from "../../utils/cache.js";

/**
 * POST /api/v1/items/categories
 * Create a new category for the calling tenantAdmin's tenant.
 */
export const addCategory = asyncHandler(async (req, res) => {
  const { name, imageUrl } = req.body;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage categories");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  // Validation
  if (!name || !name.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const category = new Category({
    name: name.trim(),
    imageKey: imageUrl?.trim() || null,
    tenantId,
    createdBy: user._id
  });

  try {
    await category.save();
  } catch (err) {
    throw parseDuplicateKeyError(err, { name: "Category with this name already exists for your organization" }) ?? err;
  }

  const categoryWithUrl = await withPresignedUrl(category.toObject());

  // Invalidate menu cache so next GET /menu/all reflects the new category
  await invalidateMenuCache(tenantId);

  return res.status(201).json(
    new ApiResponse(201, categoryWithUrl, "Category created successfully")
  );
});

/**
 * GET /api/v1/items/categories
 * List all categories for the calling tenantAdmin's tenant.
 */
export const getCategories = asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage categories");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const categoriesRaw = await Category.find({ tenantId }).select("-__v").lean();
  const categories = await withPresignedUrls(categoriesRaw);

  return res.status(200).json(
    new ApiResponse(200, categories, "Categories retrieved successfully")
  );
});

/**
 * PATCH /api/v1/items/categories/:categoryId
 * Update a category's name, image, or status.
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, imageUrl, status } = req.body;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage categories");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const category = await Category.findOne({ _id: categoryId, tenantId });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Update name — let the unique index catch conflicts
  if (name && name !== category.name) {
    category.name = name.trim();
  }

  if (imageUrl !== undefined) {
    category.imageKey = imageUrl?.trim() || null;
  }

  if (status !== undefined) {
    category.status = status;
  }

  try {
    await category.save();
  } catch (err) {
    throw parseDuplicateKeyError(err, { name: "Category with this name already exists" }) ?? err;
  }

  const updatedCategory = await withPresignedUrl(category.toObject());

  // Invalidate menu cache so next GET /menu/all reflects the updated category
  await invalidateMenuCache(tenantId);

  return res.status(200).json(
    new ApiResponse(200, updatedCategory, "Category updated successfully")
  );
});

/**
 * DELETE /api/v1/items/categories/:categoryId
 * Permanently delete a category.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage categories");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const category = await Category.findOneAndDelete({ _id: categoryId, tenantId });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Invalidate menu cache so next GET /menu/all reflects the deletion
  await invalidateMenuCache(tenantId);

  return res.status(200).json(
    new ApiResponse(200, null, "Category deleted successfully")
  );
});
