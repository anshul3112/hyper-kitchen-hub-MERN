import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { getKitchenOrders } from "../controllers/getKitchenOrders.js";
import { updateFulfillmentStatus } from "../controllers/updateFulfillmentStatus.js";

const router = Router();

// All kitchen routes require a logged-in user (kitchenStaff / outletAdmin)
router.use(verifyJWT);

// GET  /api/v1/kitchen/orders           → fetch active (non-served) completed orders
router.get("/orders", getKitchenOrders);

// PATCH /api/v1/kitchen/orders/:orderId/status → advance fulfillmentStatus one step
router.patch("/orders/:orderId/status", updateFulfillmentStatus);

export default router;
