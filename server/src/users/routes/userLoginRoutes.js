import { Router } from "express";
import { loginUser, logoutUser } from "../controllers/loginUser.js";
import { forgotPassword } from "../controllers/forgotPassword.js";

const router = Router();

router.route('/login').post(loginUser);
router.route('/logout').post(logoutUser);

// POST /api/v1/users/forgot-password  (no auth — identity verified by email+phone)
router.route('/forgot-password').post(forgotPassword);

export default router;