import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { createOutlet } from "../controllers/createOutlet.js";
import { getAllOutletsByTenant } from "../controllers/getAllOutletsByTenant.js";
import { getOutletAdminsByOutlet } from "../controllers/getOutletAdminsController.js";
import { toggleOutletStatus } from "../controllers/toggleOutletStatus.js";

const router = Router();

router.route('/').post(verifyJWT, createOutlet);
router.route('/').get(verifyJWT, getAllOutletsByTenant);
router.route('/admins/:outletId').get(verifyJWT, getOutletAdminsByOutlet);

// PATCH /api/v1/outlets/:outletId/toggle  — tenantAdmin only
router.route('/:outletId/toggle').patch(verifyJWT, toggleOutletStatus);

export default router;
