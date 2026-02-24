import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { verifyDisplayJWT } from "../../../common/middlewares/displayAuthMiddleware.js";
import { createDisplay, getAllDisplays } from "../controllers/createDisplay.js";
import { loginDisplay } from "../controllers/loginDisplay.js";
import { getDisplayOrders } from "../controllers/getDisplayOrders.js";
import { toggleDisplay } from "../controllers/toggleDisplay.js";

const router = Router();

// ── Public: display device login (no auth) ───────────────────────────────────
// POST /api/v1/displays/login   { loginCode }
router.post("/login", loginDisplay);

// ── OutletAdmin: manage display devices ──────────────────────────────────────
// POST /api/v1/displays/create
router.post("/create", verifyJWT, createDisplay);
// GET  /api/v1/displays
router.get("/", verifyJWT, getAllDisplays);
// PATCH /api/v1/displays/:id/toggle
router.patch("/:id/toggle", verifyJWT, toggleDisplay);

// ── Display device routes ─────────────────────────────────────────────────────
// GET /api/v1/displays/orders  → active non-served orders for customer view
router.get("/orders", verifyDisplayJWT, getDisplayOrders);

export { verifyDisplayJWT };
export default router;
