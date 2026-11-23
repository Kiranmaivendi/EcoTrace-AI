import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  hash: String,
  expiresAt: Date,
  type: { type: String, enum: ["email", "reset"] }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["consumer", "manufacturer", "admin"], default: "consumer" },
  manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: "Manufacturer" },
  isEmailVerified: { type: Boolean, default: false },
  otp: otpSchema
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
