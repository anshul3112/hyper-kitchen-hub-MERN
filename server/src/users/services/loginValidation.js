export function validateLogin(data) {
  if (!data.email?.trim()) throw new ApiError(400, "Email required");
  if (!data.password?.trim()) throw new ApiError(400, "Password required");
}