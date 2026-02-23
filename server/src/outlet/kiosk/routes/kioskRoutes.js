import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { verifyKioskJWT } from "../../../common/middlewares/kioskAuthMiddleware.js";
import { createKiosk } from "../controllers/createKiosk.js";
import { getAllKiosks } from "../controllers/getAllKiosks.js";
import { toggleKiosk } from "../controllers/toggleKiosk.js";
import { loginKiosk } from "../controllers/loginKiosk.js";

const router = Router();

// ── Public: kiosk device login (no auth) ─────────────────────────────────────
// POST /api/v1/kiosks/login   { loginCode }
router.route('/login').post(loginKiosk);

// ── Outlet-admin routes ───────────────────────────────────────────────────────
router.route('/create').post(verifyJWT, createKiosk);
router.route('/').get(verifyJWT, getAllKiosks);
router.route('/:id/toggle').patch(verifyJWT, toggleKiosk);

// ── Kiosk-device routes (add below with verifyKioskJWT) ──────────────────────
// router.route('/orders').get(verifyKioskJWT, getOrders);

export { verifyKioskJWT };
export default router;
