import { Router } from "express";
import { verifyKioskJWT } from "../../kiosk/routes/kioskRoutes.js";
import { placeOrder } from "../controllers/placeOrder.js";

const router = Router();

// POST /api/v1/orders
// Kiosk device places a new order. Internally calls mock payment and uses a transaction.
router.route("/").post(verifyKioskJWT, placeOrder);

export default router;
