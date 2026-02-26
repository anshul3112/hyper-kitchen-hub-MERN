import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import {
  getAnalyticsOverview,
  getOrderHistory,
  getRevenueTrends,
} from "../controllers/analyticsController.js";

const router = Router();

router.route("/overview").get(verifyJWT, getAnalyticsOverview);
router.route("/orders").get(verifyJWT, getOrderHistory);
router.route("/revenue-trends").get(verifyJWT, getRevenueTrends);

export default router;
