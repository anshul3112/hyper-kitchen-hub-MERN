import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../users/models/userModel.js"

const verifyJWT = async (req, _, next) => {
  try {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request, missing token");
  }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select("-password");
    if (!user) {
      throw new ApiError(401, "Invalid token access");
    }

    req.user = user;
    next();

  } catch (err) {
    throw new ApiError(401, "Invalid or expired access token");
  }
};

export { verifyJWT };
