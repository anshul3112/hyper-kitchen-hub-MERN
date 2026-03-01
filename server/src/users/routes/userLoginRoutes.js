import { Router } from "express";
import { loginUser } from "../controllers/loginUser.js";
import { forgotPassword } from "../controllers/forgotPassword.js";

const router = Router();

router.route('/login').post(loginUser);

// POST /api/v1/users/forgot-password  (no auth — identity verified by email+phone)
router.route('/forgot-password').post(forgotPassword);

export default router;