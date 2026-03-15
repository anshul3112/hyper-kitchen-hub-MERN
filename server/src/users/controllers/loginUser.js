import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateLogin } from "../services/loginValidation.js";

const ACCESS_COOKIE_NAME = "accessToken";

const getAccessCookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
});

/**
 * POST /api/v1/users/login
 * Authenticate a user and issue a JWT in an httpOnly cookie.
 */
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    validateLogin(req.body);

    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password");
    }
  
    const accessToken = user.generateAccessToken();

      const {  password : _password , ...safeUser } = user.toObject();

    res
      .cookie(ACCESS_COOKIE_NAME, accessToken, getAccessCookieOptions())
      .status(200)
      .json(new ApiResponse(200, { user: safeUser }, "Login successful"));
});

/**
 * POST /api/v1/users/logout
 * Clears the auth cookie.
 */
export const logoutUser = asyncHandler(async (_, res) => {
  res
    .clearCookie(ACCESS_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    .status(200)
    .json(new ApiResponse(200, {}, "Logout successful"));
});
