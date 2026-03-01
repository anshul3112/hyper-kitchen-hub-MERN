import { Router } from "express";
import { verifyJWT } from "../../../common/middlewares/authMiddleware.js";
import {
  getAnalyticsOverview,
  getOrderHistory,
  getRevenueTrends,
  getTenantOrderHistory,
  getOutletOrderHistory,
  getHourlyHistory,
} from "../controllers/analyticsController.js";

const router = Router();

router.route("/overview").get(verifyJWT, getAnalyticsOverview);
router.route("/orders").get(verifyJWT, getOrderHistory);
router.route("/revenue-trends").get(verifyJWT, getRevenueTrends);
router.route("/tenant-orders").get(verifyJWT, getTenantOrderHistory);
router.route("/outlet-orders").get(verifyJWT, getOutletOrderHistory);
router.route("/hourly").get(verifyJWT, getHourlyHistory);

export default router;
