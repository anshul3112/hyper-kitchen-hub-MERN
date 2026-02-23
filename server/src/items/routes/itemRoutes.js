import { Router } from "express";
import { verifyJWT } from "../../common/middlewares/authMiddleware.js";
import {
  addItem,
  getItems,
  editItem,
  deleteItem,
} from "../controllers/itemController.js";
import {
  addFilter,
  getFilters,
  updateFilter,
  deleteFilter,
} from "../controllers/filterController.js";
import {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { getMenuDetails } from "../controllers/getMenuDetails.js";
import {
  getOutletInventory,
  upsertInventoryItem,
  updateInventoryPrice,
  updateInventoryQuantity,
} from "../controllers/inventoryController.js";

const router = Router();

router.use(verifyJWT);

// Filter routes
router.route("/filters").post(addFilter);
router.route("/filters").get(getFilters);
router.route("/filters/:filterId").patch(updateFilter);
router.route("/filters/:filterId").delete(deleteFilter);

// Category routes
router.route("/categories").post(addCategory);
router.route("/categories").get(getCategories);
router.route("/categories/:categoryId").patch(updateCategory);
router.route("/categories/:categoryId").delete(deleteCategory);

// Item routes
router.route("/").post(addItem);
router.route("/").get(getItems);
router.route("/:itemId").patch(editItem); // use this to disable item too
router.route("/:itemId").delete(deleteItem);

// Menu details route (get all categories, filters, items together)
router.route("/menu/all").get(getMenuDetails);

// ── Outlet-level inventory routes (outletAdmin only) ──────────────────────────
// GET    /api/v1/items/inventory              → all inventory for caller's outlet
// PUT    /api/v1/items/inventory/:itemId      → upsert price + quantity
// PATCH  /api/v1/items/inventory/:itemId/price → change price only
// PATCH  /api/v1/items/inventory/:itemId/quantity   → change quantity only
router.route("/inventory").get(getOutletInventory);
router.route("/inventory/:itemId").put(upsertInventoryItem);
router.route("/inventory/:itemId/price").patch(updateInventoryPrice);
router.route("/inventory/:itemId/quantity").patch(updateInventoryQuantity);

export default router;
