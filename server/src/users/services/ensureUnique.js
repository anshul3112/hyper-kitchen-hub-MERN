import { User } from "../models/userModel.js";
import { ApiError } from "../../utils/ApiError.js";

export async function ensureUniqueEmailAndPhone(email, phoneNumber) {
  const existingUser = await User.findOne({
    $or: [{ email: email }, { phoneNumber: phoneNumber }],
  });
  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, "Email already exists");
    } else {
      throw new ApiError(400, "Phone number already exists");
    }
  }
}
