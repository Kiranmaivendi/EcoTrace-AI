import dotenv from "dotenv";

dotenv.config({ path: new URL("../../.env", import.meta.url) });
dotenv.config();

export const config = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openAiVisionModel: process.env.OPENAI_VISION_MODEL || ""
});
