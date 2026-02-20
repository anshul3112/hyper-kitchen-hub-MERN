import { Router } from "express";
import { verifyJWT } from "../../common/middlewares/authMiddleware.js";
import { createOutletAdmin } from "../controllers/createUser.js";
import { createTenantAdmin } from "../controllers/createUser.js";
import { createSuperAdmin } from "../controllers/createUser.js";

const router = Router();

router.route('/create-outlet-admin').post(
    verifyJWT,
    createOutletAdmin
)

router.route('/create-tenant-admin').post(
    verifyJWT,
    createTenantAdmin
)

router.route('/create-super-admin').post(
    verifyJWT,
    createSuperAdmin
)

export default router