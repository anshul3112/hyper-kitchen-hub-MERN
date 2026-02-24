import { Outlet } from "../models/outletModel.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function getNextOrderNumber(outletId, session = null) {
  const options = { new: true };
  if (session) options.session = session;

  const outlet = await Outlet.findByIdAndUpdate(
    outletId,
    { $inc: { orderNumber: 1 } },
    options
  );

  if (!outlet) {
    throw new ApiError(404, "Outlet not found while generating order number");
  }

  return outlet.orderNumber;
}

export const getNextOrderNumberHandler = asyncHandler(async (req, res) => {
  const { outletId } = req.params;
  const nextNo = await getNextOrderNumber(outletId);
  return res.status(200).json(
    new ApiResponse(200, { orderNumber: nextNo }, "Order number incremented")
  );
});
