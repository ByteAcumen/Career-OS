import { Resend } from "resend";

import type { WeeklyDigest } from "@/features/digest/build-weekly-digest";
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
    throw new Error("Missing RESEND_API_KEY. Email delivery is unavailable.");
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

function renderEmailShell(options: {
  eyebrow: string;
  title: string;
  intro: string;
  bodyHtml: string;
  footer?: string;
}) {
  return `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:680px;margin:0 auto;padding:32px;background:#080808;color:#f5f5f5;border-radius:24px;border:1px solid rgba(255,255,255,0.08)">
      <div style="display:inline-flex;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a1a1aa;background:rgba(255,255,255,0.03)">
        ${escapeHtml(options.eyebrow)}
      </div>
      <h1 style="margin:18px 0 12px;font-size:30px;line-height:1.08;color:#ffffff">${escapeHtml(options.title)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#d4d4d8">${escapeHtml(options.intro)}</p>
      ${options.bodyHtml}
      <hr style="margin:24px 0;border:none;border-top:1px solid rgba(255,255,255,0.08)"/>
      <p style="margin:0;font-size:12px;line-height:1.7;color:#8a8a92">
        ${escapeHtml(options.footer || "Career OS / private student workspace")}
      </p>
    </div>
  `;
}

function renderButton(label: string, url: string) {
  return `
    <div style="margin:24px 0">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;border-radius:14px;background:#ffffff;color:#080808;text-decoration:none;font-weight:700">
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function renderInfoCard(text: string) {
  return `
    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:18px;background:rgba(255,255,255,0.03);font-size:14px;line-height:1.75;color:#d4d4d8">
      ${escapeHtml(text)}
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      html: renderEmailShell({
        eyebrow: "Career OS security",
        title: "Reset your password",
        intro:
          "Use the secure link below to set a new password for your Career OS account. The link expires in one hour.",
        bodyHtml: [
          renderButton("Reset password", resetUrl),
          renderInfoCard(
            "If you did not request a reset, ignore this email. Your current password will remain active.",
          ),
        ].join(""),
      }),
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
      html: renderEmailShell({
        eyebrow: "Career OS security",
        title: "Verify your email",
        intro:
          "Confirm this email address to activate password sign-in and secure the workspace behind your account.",
        bodyHtml: [
          renderButton("Verify email", verificationUrl),
          renderInfoCard(
            "If you did not create this account, ignore the message and no changes will be applied.",
          ),
        ].join(""),
      }),
    });
    console.log(`[email] Verification email sent to ${email}`);
  } catch (error) {
    const normalizedError = normalizeEmailError(error, "email verification");
    console.error("[email] Failed to send verification email:", normalizedError);
    throw normalizedError;
  }
}

export async function sendWeeklyDigestEmail(email: string, digest: WeeklyDigest) {
  try {
    const emailClient = getResendClient();
    await emailClient.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: digest.subject,
      html: renderEmailShell({
        eyebrow: "Career OS weekly digest",
        title: digest.headline,
        intro: digest.preview,
        bodyHtml: digest.html,
        footer: "Career OS / weekly review generated from your private workspace data",
      }),
    });
    console.log(`[email] Weekly digest email sent to ${email}`);
  } catch (error) {
    const normalizedError = normalizeEmailError(error, "weekly digest");
    console.error("[email] Failed to send weekly digest email:", normalizedError);
    throw normalizedError;
  }
}
