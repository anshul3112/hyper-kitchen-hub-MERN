import { Filters } from "../models/filterModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { withPresignedUrls, withPresignedUrl } from "../../utils/s3.js";

// Add new filter
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

  // Check if filter already exists for this tenant
  const existingFilter = await Filters.findOne({
    name: name.trim(),
    tenantId
  });

  if (existingFilter) {
    throw new ApiError(409, "Filter with this name already exists for your organization");
  }

  const filter = new Filters({
    name: name.trim(),
    imageKey: imageUrl?.trim() || null, // frontend sends imageUrl, stored as S3 key
    tenantId,
    createdBy: user._id
  });

  await filter.save();

  const filterWithUrl = await withPresignedUrl(filter.toObject());
  return res.status(201).json(
    new ApiResponse(201, filterWithUrl, "Filter created successfully")
  );
});

// Get all filters for a tenant
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

// Update filter
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

  // Check for duplicate name
  if (name && name !== filter.name) {
    const existingFilter = await Filters.findOne({
      name: name.trim(),
      tenantId,
      _id: { $ne: filterId }
    });

    if (existingFilter) {
      throw new ApiError(409, "Filter with this name already exists");
    }

    filter.name = name.trim();
  }

  if (imageUrl !== undefined) {
    filter.imageKey = imageUrl?.trim() || null; // frontend sends imageUrl, we store as imageKey
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  await filter.save();

  const updatedFilter = await withPresignedUrl(filter.toObject());
  return res.status(200).json(
    new ApiResponse(200, updatedFilter, "Filter updated successfully")
  );
});

// Delete filter
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
