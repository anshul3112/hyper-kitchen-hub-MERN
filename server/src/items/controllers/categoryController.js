import { Category } from "../models/categoryModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { withPresignedUrls, withPresignedUrl } from "../../utils/s3.js";

// Add new category
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

  // Check if category already exists for this tenant
  const existingCategory = await Category.findOne({
    name: name.trim(),
    tenantId
  });

  if (existingCategory) {
    throw new ApiError(409, "Category with this name already exists for your organization");
  }

  const category = new Category({
    name: name.trim(),
    imageKey: imageUrl?.trim() || null, // frontend sends imageUrl, stored as S3 key
    tenantId,
    createdBy: user._id
  });

  await category.save();

  const categoryWithUrl = await withPresignedUrl(category.toObject());
  return res.status(201).json(
    new ApiResponse(201, categoryWithUrl, "Category created successfully")
  );
});

// Get all categories for a tenant
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

// Update category
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

  // Check for duplicate name
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name: name.trim(),
      tenantId,
      _id: { $ne: categoryId }
    });

    if (existingCategory) {
      throw new ApiError(409, "Category with this name already exists");
    }

    category.name = name.trim();
  }

  if (imageUrl !== undefined) {
    category.imageKey = imageUrl?.trim() || null; // frontend sends imageUrl, we store as imageKey
  }

  if (status !== undefined) {
    category.status = status;
  }

  await category.save();

  const updatedCategory = await withPresignedUrl(category.toObject());
  return res.status(200).json(
    new ApiResponse(200, updatedCategory, "Category updated successfully")
  );
});

// Delete category
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

  return res.status(200).json(
    new ApiResponse(200, null, "Category deleted successfully")
  );
});
