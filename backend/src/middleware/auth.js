import jwt from "jsonwebtoken";
import { config } from "../config.js";
import User from "../models/User.js";
import { isDatabaseAvailable } from "../db.js";
import { errorResponse } from "../utils/errors.js";

export function requireDatabase(req, res, next) {
  if (!isDatabaseAvailable()) {
    return errorResponse(res, 503, "DATABASE_UNAVAILABLE", "MongoDB is unavailable");
  }
  next();
}

export async function requireAuth(req, res, next) {
  if (!isDatabaseAvailable()) return errorResponse(res, 503, "DATABASE_UNAVAILABLE", "MongoDB is unavailable");
  if (!config.jwtSecret) return errorResponse(res, 503, "AUTH_UNAVAILABLE", "JWT_SECRET is not configured");
  const token = req.cookies?.token;
  if (!token) return errorResponse(res, 401, "UNAUTHENTICATED", "Authentication required");
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return errorResponse(res, 401, "UNAUTHENTICATED", "Authentication required");
  }
  try {
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return errorResponse(res, 401, "UNAUTHENTICATED", "Authentication required");
    if (!user.isEmailVerified) return errorResponse(res, 403, "EMAIL_NOT_VERIFIED", "Email verification required");
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, "FORBIDDEN", "Insufficient role permissions");
    }
    next();
  };
}

export function signUser(user, res) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}
