import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { createOutlet } from "../controllers/createOutlet.js";
import { getAllOutletsByTenant } from "../controllers/getAllOutletsByTenant.js";
import { getOutletAdminsByOutlet } from "../controllers/getOutletAdminsController.js";

const router = Router();

router.route('/').post(
    verifyJWT,
    createOutlet
);


router.route('/').get(
    verifyJWT,
    getAllOutletsByTenant
);

router.route('/admins/:outletId').get(
    verifyJWT,
    getOutletAdminsByOutlet
);

export default router;
