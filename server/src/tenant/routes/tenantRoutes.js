import { Router } from "express";
import { verifyJWT } from "../../common/middlewares/authMiddleware.js";
import { createTenant } from "../controllers/createTenant.js";
import { getAllTenants } from "../controllers/getAllTenants.js";
import { toggleTenantStatus, getTenantDetails } from "../controllers/tenantManagement.js";

const router = Router();

router.route('/create-tenant').post(verifyJWT, createTenant);
router.route('/').get(verifyJWT, getAllTenants);
router.route('/:tenantId/toggle-status').patch(verifyJWT, toggleTenantStatus);
router.route('/:tenantId/details').get(verifyJWT, getTenantDetails);

export default router;
