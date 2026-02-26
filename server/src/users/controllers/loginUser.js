import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateLogin } from "../services/loginValidation.js";

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
      .status(200)
      .json(new ApiResponse(200, { accessToken,  user: safeUser }, "Login successful"));
});
