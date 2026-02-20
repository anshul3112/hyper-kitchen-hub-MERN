import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { createKiosk } from "../controllers/createKiosk.js";
import { getAllKiosks } from "../controllers/getAllKiosks.js";

const router = Router();

router.route('/create').post(
    verifyJWT,
    createKiosk
);

router.route('/').get(
    verifyJWT,
    getAllKiosks
);

export default router;
