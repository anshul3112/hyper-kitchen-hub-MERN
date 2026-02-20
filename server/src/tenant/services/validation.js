import { ApiError } from "../../utils/ApiError.js";

export function validateCreateTenant(data) {
  if (!data.name?.trim()) throw new ApiError(400, "Tenant name required");
  if (!data.address?.trim()) throw new ApiError(400, "Address required");
}
