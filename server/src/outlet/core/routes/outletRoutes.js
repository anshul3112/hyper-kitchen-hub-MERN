import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { createOutlet } from "../controllers/createOutlet.js";
import { getAllOutletsByTenant } from "../controllers/getAllOutletsByTenant.js";
import { getOutletAdminsByOutlet } from "../controllers/getOutletAdminsController.js";
import { toggleOutletStatus } from "../controllers/toggleOutletStatus.js";
import { getNextOrderNumberHandler } from "../controllers/getNextOrderNumber.js";

const router = Router();

router.route('/').post(verifyJWT, createOutlet);
router.route('/').get(verifyJWT, getAllOutletsByTenant);
router.route('/admins/:outletId').get(verifyJWT, getOutletAdminsByOutlet);

// PATCH /api/v1/outlets/:outletId/toggle  — tenantAdmin only
router.route('/:outletId/toggle').patch(verifyJWT, toggleOutletStatus);

// POST /api/v1/outlets/:outletId/order-number/next  — increment & return next order number
router.route('/:outletId/order-number/next').post(verifyJWT, getNextOrderNumberHandler);

export default router;
