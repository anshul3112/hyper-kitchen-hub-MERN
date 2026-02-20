import { ApiError } from "../../../utils/ApiError.js";

export function validateCreateOutlet(data) {
  if (!data.name?.trim()) throw new ApiError(400, "Outlet name required");
  if (!data.tenant?.tenantId || !data.tenant?.tenantName)
    throw new ApiError(400, "Tenant name and id required");
  if (!data.address?.trim()) throw new ApiError(400, "Address required");
}
