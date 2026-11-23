import { config } from "../config.js";

export function emailAvailable() {
  if (config.env === "development") {
    return true;
  }
  return Boolean(config.resendApiKey && config.emailFrom);
}

export async function sendOtpEmail(email, otp, purpose) {
  if (!emailAvailable()) {
    return { sent: false, unavailable: true, reason: "RESEND_API_KEY and EMAIL_FROM are required" };
  }
  if (config.env === "development" && (!config.resendApiKey || !config.emailFrom)) {
    console.info(`[EcoTrace dev] ${purpose === "reset" ? "Password reset" : "Email verification"} OTP for ${email}: ${otp}`);
    return { sent: true, development: true };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [email],
        subject: purpose === "reset" ? "EcoTrace password reset code" : "Verify your EcoTrace email",
        text: `Your EcoTrace ${purpose === "reset" ? "password reset" : "email verification"} code is ${otp}. It expires in 10 minutes.`
      })
    });
    if (!response.ok) {
      return { sent: false, reason: "Email provider rejected the request" };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "Email provider request failed" };
  }
}
