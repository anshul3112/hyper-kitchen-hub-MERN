import { Outlet } from "../models/outletModel.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function ensureUniqueOutletFields(name, tenant, contacts) {
  const orConditions = [
    { name: name.trim(), "tenant.tenantId": tenant.tenantId },
  ];

  if (contacts?.email?.trim()) {
    orConditions.push({
      "contacts.email": contacts.email.trim(),
      "tenant.tenantId": tenant.tenantId,
    });
  }

  if (contacts?.phoneNumber?.trim()) {
    orConditions.push({
      "contacts.phoneNumber": contacts.phoneNumber.trim(),
      "tenant.tenantId": tenant.tenantId,
    });
  }

  const existingOutlet = await Outlet.findOne({ $or: orConditions });

  if (existingOutlet) {
    if (
      existingOutlet.name === name.trim() &&
      existingOutlet.tenant.tenantId.toString() === tenant.tenantId.toString()
    ) {
      throw new ApiError(400, "Outlet with this name already exists");
    }
    if (
      contacts?.email?.trim() &&
      existingOutlet.contacts?.email === contacts.email.trim()
    ) {
      throw new ApiError(400, "Outlet with this email already exists");
    }
    if (
      contacts?.phoneNumber?.trim() &&
      existingOutlet.contacts?.phoneNumber === contacts.phoneNumber.trim()
    ) {
      throw new ApiError(400, "Outlet with this phone number already exists");
    }
  }
}
