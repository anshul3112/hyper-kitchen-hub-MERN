import { Router } from "express";
import { verifyJWT } from "../../common/middlewares/authMiddleware.js";
import { createOutletAdmin, createTenantAdmin, createSuperAdmin, createOutletStaff } from "../controllers/createUser.js";
import { getOutletStaff } from "../controllers/getUsers.js";
import { getAllUsers, toggleUserStatus } from "../controllers/manageUsers.js";
import { getProfile, changePassword, updateProfile } from "../controllers/userProfile.js";

const router = Router();

router.route('/create-outlet-admin').post(
    verifyJWT,
    createOutletAdmin
)

router.route('/create-tenant-admin').post(
    verifyJWT,
    createTenantAdmin
)

router.route('/create-super-admin').post(
    verifyJWT,
    createSuperAdmin
)

// POST  /api/v1/users/create-outlet-staff  — outletAdmin creates kitchenStaff / billingStaff
router.route('/create-outlet-staff').post(verifyJWT, createOutletStaff);

// GET   /api/v1/users/outlet-staff         — outletAdmin lists their staff
router.route('/outlet-staff').get(verifyJWT, getOutletStaff);

// GET   /api/v1/users/all                  — superAdmin lists all users (paginated)
router.route('/all').get(verifyJWT, getAllUsers);

// PATCH /api/v1/users/:userId/toggle-status — superAdmin enables/disables a user
router.route('/:userId/toggle-status').patch(verifyJWT, toggleUserStatus);

// GET  /api/v1/users/profile              — get own profile
router.route('/profile').get(verifyJWT, getProfile);

// PATCH /api/v1/users/profile/change-password — change own password
router.route('/profile/change-password').patch(verifyJWT, changePassword);

// PATCH /api/v1/users/profile/update — update own name / email / phone
router.route('/profile/update').patch(verifyJWT, updateProfile);

export default router;