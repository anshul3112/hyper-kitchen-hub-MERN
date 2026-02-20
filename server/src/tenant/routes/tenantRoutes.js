import { Router } from "express";
import { verifyJWT } from "../../common/middlewares/authMiddleware.js";
import { createTenant } from "../controllers/createTenant.js";
import { getAllTenants } from "../controllers/getAllTenants.js";

const router = Router();

router.route('/create-tenant').post(
    verifyJWT,
    createTenant
);

router.route('/').get(
    verifyJWT,
    getAllTenants
);

export default router;
