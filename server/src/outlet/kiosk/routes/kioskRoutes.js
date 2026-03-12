import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import { verifyKioskJWT } from "../../../common/middlewares/kioskAuthMiddleware.js";
import { createKiosk } from "../controllers/createKiosk.js";
import { getAllKiosks } from "../controllers/getAllKiosks.js";
import { toggleKiosk } from "../controllers/toggleKiosk.js";
import { loginKiosk } from "../controllers/loginKiosk.js";
import { getKioskMenu } from "../controllers/getKioskMenu.js";
import { getKioskInventory } from "../controllers/getKioskInventory.js";
import { getKioskLanguages } from "../controllers/getKioskLanguages.js";
import { createRecommendationSlot } from "../controllers/createRecommendationSlot.js";
import { getRecommendationSlots } from "../controllers/getRecommendationSlots.js";
import { updateRecommendationSlot } from "../controllers/updateRecommendationSlot.js";
import { deleteRecommendationSlot } from "../controllers/deleteRecommendationSlot.js";
import { getKioskRecommendations } from "../controllers/getKioskRecommendations.js";

const router = Router();

// ── Public: kiosk device login (no auth) ─────────────────────────────────────
// POST /api/v1/kiosks/login   { loginCode }
router.route('/login').post(loginKiosk);

// ── Outlet-admin routes ───────────────────────────────────────────────────────
router.route('/create').post(verifyJWT, createKiosk);
router.route('/').get(verifyJWT, getAllKiosks);
router.route('/:id/toggle').patch(verifyJWT, toggleKiosk);

// ── Outlet-admin: recommendation slot CRUD ───────────────────────────────────
// POST   /api/v1/kiosks/admin/recommendations       → create slot
// GET    /api/v1/kiosks/admin/recommendations       → list slots
// PUT    /api/v1/kiosks/admin/recommendations/:id   → update slot
// DELETE /api/v1/kiosks/admin/recommendations/:id   → delete slot
router.route('/admin/recommendations')
  .post(verifyJWT, createRecommendationSlot)
  .get(verifyJWT, getRecommendationSlots);
router.route('/admin/recommendations/:id')
  .put(verifyJWT, updateRecommendationSlot)
  .delete(verifyJWT, deleteRecommendationSlot);

// ── Kiosk-device routes ───────────────────────────────────────────────────────
// GET /api/v1/kiosks/menu              → fetch all menu (categories, filters, items)
// GET /api/v1/kiosks/inventory         → fetch outlet inventory with schedule-resolved activePrice
// GET /api/v1/kiosks/languages         → fetch tenant language settings
// GET /api/v1/kiosks/recommendations   → fetch active recommended items for this outlet
router.route('/menu').get(verifyKioskJWT, getKioskMenu);
router.route('/inventory').get(verifyKioskJWT, getKioskInventory);
router.route('/languages').get(verifyKioskJWT, getKioskLanguages);
router.route('/recommendations').get(verifyKioskJWT, getKioskRecommendations);

export { verifyKioskJWT };
export default router;
