import crypto from "crypto";
import bcrypt from "bcryptjs";

export function createOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}
