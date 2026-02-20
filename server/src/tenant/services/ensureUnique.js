import { Tenant } from "../models/tenantModel.js";
import { ApiError } from "../../utils/ApiError.js";

export async function ensureUniqueTenantFields(name, contacts) {
    const orConditions = [
        { name: name.trim() },
    ];  

    if (contacts?.email?.trim()) {
        orConditions.push({ "contacts.email": contacts.email.trim() });
    }
    if (contacts?.phoneNumber?.trim()) {
        orConditions.push({ "contacts.phoneNumber": contacts.phoneNumber.trim() });
    }

  const existingTenant = await Tenant.findOne({
    $or: orConditions 
  });

  if (existingTenant) {
    if (existingTenant.name === name.trim()) {
      throw new ApiError(400, "Tenant with this name already exists");
    }
    if (existingTenant.contacts?.email === contacts.email.trim()) {
      throw new ApiError(400, "Tenant with this email already exists");
    }
    if (existingTenant.contacts?.phoneNumber === contacts.phoneNumber.trim()) {
      throw new ApiError(400, "Tenant with this phone number already exists");
    }
  }
}
