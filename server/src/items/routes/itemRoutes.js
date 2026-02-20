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

export default router;
