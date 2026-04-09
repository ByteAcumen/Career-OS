import { Resend } from "resend";

import { getEnvValue } from "@/lib/env";

const resendApiKey = getEnvValue("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const configuredFromAddress =
  getEnvValue("RESEND_FROM_EMAIL") ||
  getEnvValue("EMAIL_FROM");
const SANDBOX_FROM_ADDRESS = "Career OS <onboarding@resend.dev>";
const FROM_ADDRESS = configuredFromAddress || SANDBOX_FROM_ADDRESS;

function getResendClient() {
  if (!resend) {
    throw new Error("Missing RESEND_API_KEY. Password reset email cannot be sent.");
  }

  if (!configuredFromAddress && process.env.NODE_ENV === "production") {
    console.warn(
      "[email] RESEND_FROM_EMAIL is missing. Falling back to the Resend sandbox sender. Configure a verified sender for real-user email delivery.",
    );
  }

  return resend;
}

function normalizeEmailError(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("testing emails") || normalized.includes("sandbox")) {
    return new Error(
      `Career OS is still using the Resend sandbox sender. Set RESEND_FROM_EMAIL to a verified sender so ${action} emails can reach real users.`,
    );
  }

  if (normalized.includes("verify a domain") || normalized.includes("domain is not verified")) {
    return new Error(
      `The configured sender domain is not verified in Resend. Verify the sender behind RESEND_FROM_EMAIL before ${action} emails can be delivered.`,
    );
  }

  return error instanceof Error ? error : new Error(message);
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
) {
  try {
    const emailClient = getResendClient();
    await emailClient.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Reset your Career OS password",
      html: `
        <div style="font-family:'Inter',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#e2e8f0;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
          <div style="text-align:center;margin-bottom:24px">
            <span style="display:inline-block;padding:6px 16px;border-radius:999px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5eead4;border:1px solid rgba(20,184,166,0.2);background:rgba(20,184,166,0.06)">Career OS</span>
          </div>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:white;text-align:center">Reset your password</h2>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#94a3b8;text-align:center">
            Click the button below to set a new password for your Career OS account. This link expires in 1 hour.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;font-size:14px;font-weight:600;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(20,184,166,0.25)">
              Reset password &rarr;
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;text-align:center">
            If you didn't request this, ignore this email. Your password will remain unchanged.
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid rgba(255,255,255,0.06)"/>
          <p style="margin:0;font-size:11px;color:#475569;text-align:center">
            Career OS &middot; Secure Workspace
          </p>
        </div>
      `,
    });
    console.log(`[email] Password reset email sent to ${email}`);
  } catch (error) {
    const normalizedError = normalizeEmailError(error, "password reset");
    console.error("[email] Failed to send password reset email:", normalizedError);
    throw normalizedError;
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
) {
  try {
    const emailClient = getResendClient();
    await emailClient.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Verify your Career OS email",
      html: `
        <div style="font-family:'Inter',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0f;color:#e2e8f0;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
          <div style="text-align:center;margin-bottom:24px">
            <span style="display:inline-block;padding:6px 16px;border-radius:999px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5eead4;border:1px solid rgba(20,184,166,0.2);background:rgba(20,184,166,0.06)">Career OS</span>
          </div>
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:white;text-align:center">Verify your email</h2>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#94a3b8;text-align:center">
            Click the button below to verify your email address and activate your Career OS workspace.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${verificationUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;font-size:14px;font-weight:600;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(20,184,166,0.25)">
              Verify email &rarr;
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;text-align:center">
            If you didn't create an account, ignore this email.
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid rgba(255,255,255,0.06)"/>
          <p style="margin:0;font-size:11px;color:#475569;text-align:center">
            Career OS &middot; Secure Workspace
          </p>
        </div>
      `,
    });
    console.log(`[email] Verification email sent to ${email}`);
  } catch (error) {
    const normalizedError = normalizeEmailError(error, "email verification");
    console.error("[email] Failed to send verification email:", normalizedError);
    throw normalizedError;
  }
}
