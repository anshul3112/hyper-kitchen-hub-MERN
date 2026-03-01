import { Filters } from "../models/filterModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { withPresignedUrls, withPresignedUrl } from "../../utils/s3.js";
import { parseDuplicateKeyError } from "../../utils/mongoError.js";

/**
 * POST /api/v1/items/filters
 * Create a new filter tag for the calling tenantAdmin's tenant.
 */
export const addFilter = asyncHandler(async (req, res) => {
  const { name, imageUrl } = req.body;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage filters");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  // Validation
  if (!name || !name.trim()) {
    throw new ApiError(400, "Filter name is required");
  }

  const filter = new Filters({
    name: name.trim(),
    imageKey: imageUrl?.trim() || null,
    tenantId,
    createdBy: user._id
  });

  try {
    await filter.save();
  } catch (err) {
    throw parseDuplicateKeyError(err, { name: "Filter with this name already exists for your organization" }) ?? err;
  }

  const filterWithUrl = await withPresignedUrl(filter.toObject());
  return res.status(201).json(
    new ApiResponse(201, filterWithUrl, "Filter created successfully")
  );
});

/**
 * GET /api/v1/items/filters
 * List all filters for the calling tenantAdmin's tenant.
 */
export const getFilters = asyncHandler(async (req, res) => {
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage filters");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const filtersRaw = await Filters.find({ tenantId }).select("-__v").lean();
  const filters = await withPresignedUrls(filtersRaw);

  return res.status(200).json(
    new ApiResponse(200, filters, "Filters retrieved successfully")
  );
});

/**
 * PATCH /api/v1/items/filters/:filterId
 * Update a filter's name, image, or active status.
 */
export const updateFilter = asyncHandler(async (req, res) => {
  const { filterId } = req.params;
  const { name, imageUrl, isActive } = req.body;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage filters");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const filter = await Filters.findOne({ _id: filterId, tenantId });

  if (!filter) {
    throw new ApiError(404, "Filter not found");
  }

  // Update name — let the unique index catch conflicts
  if (name && name !== filter.name) {
    filter.name = name.trim();
  }

  if (imageUrl !== undefined) {
    filter.imageKey = imageUrl?.trim() || null;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  try {
    await filter.save();
  } catch (err) {
    throw parseDuplicateKeyError(err, { name: "Filter with this name already exists" }) ?? err;
  }

  const updatedFilter = await withPresignedUrl(filter.toObject());
  return res.status(200).json(
    new ApiResponse(200, updatedFilter, "Filter updated successfully")
  );
});

/**
 * DELETE /api/v1/items/filters/:filterId
 * Permanently delete a filter tag.
 */
export const deleteFilter = asyncHandler(async (req, res) => {
  const { filterId } = req.params;
  const user = req.user;

  // Check if user is tenantAdmin
  if (user.role !== "tenantAdmin") {
    throw new ApiError(403, "Only tenant admins can manage filters");
  }

  const tenantId = user.tenant?.tenantId;
  if (!tenantId) {
    throw new ApiError(400, "Tenant ID is required");
  }

  const filter = await Filters.findOneAndDelete({ _id: filterId, tenantId });

  if (!filter) {
    throw new ApiError(404, "Filter not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Filter deleted successfully")
  );
});
