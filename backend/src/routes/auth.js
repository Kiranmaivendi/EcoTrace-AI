import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/User.js";
import Manufacturer from "../models/Manufacturer.js";
import { registerSchema, emailSchema, otpSchema, passwordSchema } from "../utils/validation.js";
import { createOtp, hashOtp, verifyOtp } from "../utils/otp.js";
import { sendOtpEmail, emailAvailable } from "../services/email.js";
import { signUser, requireAuth, requireDatabase } from "../middleware/auth.js";
import { errorResponse, zodDetails } from "../utils/errors.js";
import { config } from "../config.js";

const router = Router();
const authAttemptLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many account requests. Try again later." } }
});

function parse(schema, body) {
  const result = schema.safeParse(body);
  return result.success ? { data: result.data } : { error: zodDetails(result.error) };
}

router.post("/register", authAttemptLimit, requireDatabase, async (req, res, next) => {
  try {
    const parsed = parse(registerSchema, req.body);
    if (parsed.error) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid registration data", parsed.error);
    if (!emailAvailable()) return errorResponse(res, 503, "EMAIL_SERVICE_UNAVAILABLE", "RESEND_API_KEY and EMAIL_FROM are required");
    const { name, email, password, role, manufacturerName } = parsed.data;
    const existing = await User.findOne({ email });
    if (existing) return errorResponse(res, 409, "EMAIL_EXISTS", "An account already exists for this email");
    const passwordHash = await bcrypt.hash(password, 12);
    const otp = createOtp();
    const otpHash = await hashOtp(otp);
    const user = await User.create({ name, email, passwordHash, role, isEmailVerified: false, otp: { hash: otpHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), type: "email" } });
    if (role === "manufacturer") {
      const manufacturer = await Manufacturer.create({ name: manufacturerName, user: user._id });
      user.manufacturer = manufacturer._id;
      await user.save();
    }
    const sent = await sendOtpEmail(email, otp, "email");
    if (!sent.sent) return res.status(503).json({ error: { code: "EMAIL_DELIVERY_UNAVAILABLE", message: "Account exists, but verification email could not be sent.", details: sent.reason } });
    return res.status(201).json({
      message: "Verification OTP sent to email.",
      emailVerified: false,
      emailSent: true,
      developmentOtp: config.env === "development" && sent.development ? otp : undefined
    });
  } catch (error) { next(error); }
});

router.post("/verify-email", authAttemptLimit, requireDatabase, async (req, res, next) => {
  try {
    const parsed = parse(z.object({ email: emailSchema, otp: otpSchema }), req.body);
    if (parsed.error) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid verification data", parsed.error);
    const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash");
    if (!user?.otp?.hash || user.otp.type !== "email") return errorResponse(res, 400, "OTP_INVALID", "Invalid or expired OTP");
    if (user.otp.expiresAt < new Date()) return errorResponse(res, 400, "OTP_EXPIRED", "OTP has expired");
    if (!(await verifyOtp(parsed.data.otp, user.otp.hash))) return errorResponse(res, 400, "OTP_INVALID", "Invalid or expired OTP");
    if (!config.jwtSecret) return errorResponse(res, 503, "AUTH_UNAVAILABLE", "JWT_SECRET is not configured");
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();
    signUser(user, res);
    return res.json({ message: "Email verified.", user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/resend-email-otp", authAttemptLimit, requireDatabase, async (req, res, next) => {
  try {
    const parsed = parse(z.object({ email: emailSchema }), req.body);
    if (parsed.error) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid email", parsed.error);
    const user = await User.findOne({ email: parsed.data.email });
    if (!user || user.isEmailVerified) return res.json({ message: "If an account requires verification, a code may be sent." });
    if (!emailAvailable()) return errorResponse(res, 503, "EMAIL_SERVICE_UNAVAILABLE", "RESEND_API_KEY and EMAIL_FROM are required");
    const otp = createOtp();
    user.otp = { hash: await hashOtp(otp), expiresAt: new Date(Date.now() + 10 * 60 * 1000), type: "email" };
    await user.save();
    const sent = await sendOtpEmail(user.email, otp, "email");
    if (!sent.sent) return errorResponse(res, 503, "EMAIL_DELIVERY_UNAVAILABLE", sent.reason);
    return res.json({ message: "If an account requires verification, a code may be sent." });
  } catch (error) { next(error); }
});

router.post("/login", authAttemptLimit, requireDatabase, async (req, res, next) => {
  try {
    const parsed = parse(z.object({ email: emailSchema, password: z.string().min(1).max(128) }), req.body);
    if (parsed.error) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid login data", parsed.error);
    const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash");
    if (!user) return errorResponse(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return errorResponse(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");
    if (!user.isEmailVerified) return errorResponse(res, 403, "EMAIL_NOT_VERIFIED", "Email verification required");
    if (!config.jwtSecret) return errorResponse(res, 503, "AUTH_UNAVAILABLE", "JWT_SECRET is not configured");
    signUser(user, res);
    return res.json({ message: "Logged in.", user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "lax" });
  res.json({ message: "Logged out." });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post("/forgot-password", authAttemptLimit, requireDatabase, async (req, res, next) => {
  try {
    const parsed = parse(z.object({ email: emailSchema }), req.body);
    if (parsed.error) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid email", parsed.error);
    if (!emailAvailable()) return errorResponse(res, 503, "EMAIL_SERVICE_UNAVAILABLE", "RESEND_API_KEY and EMAIL_FROM are required");
    const user = await User.findOne({ email: parsed.data.email });
    if (user) {
      const otp = createOtp();
      user.otp = { hash: await hashOtp(otp), expiresAt: new Date(Date.now() + 10 * 60 * 1000), type: "reset" };
      await user.save();
      const sent = await sendOtpEmail(user.email, otp, "reset");
      if (!sent.sent) return errorResponse(res, 503, "EMAIL_DELIVERY_UNAVAILABLE", sent.reason);
    }
    return res.json({ message: "If an account exists for this email, a reset code has been sent." });
  } catch (error) { next(error); }
});

router.post("/reset-password", authAttemptLimit, requireDatabase, async (req, res, next) => {
  try {
    const parsed = parse(z.object({ email: emailSchema, otp: otpSchema, password: passwordSchema }), req.body);
    if (parsed.error) return errorResponse(res, 400, "VALIDATION_ERROR", "Invalid reset data", parsed.error);
    const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash");
    if (!user?.otp?.hash || user.otp.type !== "reset") return errorResponse(res, 400, "OTP_INVALID", "Invalid or expired OTP");
    if (user.otp.expiresAt < new Date()) return errorResponse(res, 400, "OTP_EXPIRED", "OTP has expired");
    if (!(await verifyOtp(parsed.data.otp, user.otp.hash))) return errorResponse(res, 400, "OTP_INVALID", "Invalid or expired OTP");
    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    user.otp = undefined;
    await user.save();
    return res.json({ message: "Password reset successfully." });
  } catch (error) { next(error); }
});

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, manufacturer: user.manufacturer, isEmailVerified: user.isEmailVerified };
}

export default router;
