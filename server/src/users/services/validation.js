import { ApiError } from "../../utils/ApiError.js";

export function validateCreateUserBase(data) {
  if (!data.name?.trim()) throw new ApiError(400, "Name required");
  if (!data.email?.trim()) throw new ApiError(400, "Email required");
  if (!data.phoneNumber?.trim())
    throw new ApiError(400, "Phone number required");
  if (!data.password?.trim()) throw new ApiError(400, "Password required");
}

export function validateCreateTenantAdmin(data) {
  validateCreateUserBase(data);

  if (!data.tenant || !data.tenant.tenantId || !data.tenant.tenantName)
    throw new ApiError(400, "Tenant name and id required");
}

export function validateCreateOutletAdmin(data) {
  validateCreateUserBase(data);

  if (!data.outlet || !data.outlet.outletId || !data.outlet.outletName)
    throw new ApiError(400, "Outlet name and id required");
  if (!data.tenant || !data.tenant.tenantId || !data.tenant.tenantName)
    throw new ApiError(400, "Tenant name and id required");
}

export function validateCreateSuperAdmin(data) {
  validateCreateUserBase(data);
}
