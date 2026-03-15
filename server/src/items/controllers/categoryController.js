import { Category } from "../models/categoryModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { withPresignedUrls, withPresignedUrl } from "../../utils/s3.js";
import { parseDuplicateKeyError } from "../../utils/mongoError.js";
import { invalidateMenuCache } from "../../utils/cache.js";
import { Items } from "../models/itemModel.js";

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

  // Validation — name must be an object with a non-empty English value
  if (!name || typeof name !== 'object' || !name.en?.trim()) {
    throw new ApiError(400, "Category name (English) is required");
  }

  // Build a clean name object: trim en, carry other lang values as-is
  const cleanName = { ...name, en: name.en.trim() };

  const category = new Category({
    name: cleanName,
    imageKey: imageUrl?.trim() || null,
    tenantId,
    createdBy: user._id
  });

  try {
    await category.save();
  } catch (err) {
    throw parseDuplicateKeyError(err, { 'name.en': "Category with this name already exists for your organization" }) ?? err;
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

  // Update name — validate that en is present, then replace entire object
  if (name !== undefined) {
    if (typeof name !== 'object' || !name.en?.trim()) {
      throw new ApiError(400, "English name (name.en) is required");
    }
    category.name = { ...name, en: name.en.trim() };
    category.markModified('name');
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
    throw parseDuplicateKeyError(err, { 'name.en': "Category with this name already exists" }) ?? err;
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

  const linkedItems = await Items.find({ tenantId, category: categoryId })
    .select("name")
    .lean();

  if (linkedItems.length > 0) {
    const itemNames = linkedItems
      .map((item) => (typeof item.name === "object" ? item.name?.en : ""))
      .filter(Boolean)
      .slice(0, 10);

    const suffix = linkedItems.length > 10 ? ` and ${linkedItems.length - 10} more` : "";
    throw new ApiError(
      409,
      `This category cannot be deleted because these items contain this category: [${itemNames.join(", "
      )}${suffix}]`
    );
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
