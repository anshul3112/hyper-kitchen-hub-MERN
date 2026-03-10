import { ApiError } from "../../../utils/ApiError.js";

export function validateCreateOutlet(data) {
  if (!data.name?.trim()) throw new ApiError(400, "Outlet name required");
  if (!data.tenant?.tenantId)
    throw new ApiError(400, "Tenant id required");
  if (!data.address?.trim()) throw new ApiError(400, "Address required");
}
