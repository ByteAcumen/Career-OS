import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

import { getConfiguredAppBaseUrl, normalizeOrigin } from "@/lib/app-url";
import { db, initializeSchema } from "@/lib/db";
import { getEnvValue, getEnvValues, sanitizeEnvValue } from "@/lib/env";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";
import * as schema from "@/lib/schema";

const authBaseUrl = getConfiguredAppBaseUrl();
const configuredOrigins = getEnvValues("BETTER_AUTH_TRUSTED_ORIGINS");
const googleClientId = getEnvValue("GOOGLE_CLIENT_ID");
const googleClientSecret = getEnvValue("GOOGLE_CLIENT_SECRET");
const betterAuthSecret = getEnvValue("BETTER_AUTH_SECRET");

const trustedOriginCandidates = [
  authBaseUrl,
  getEnvValue("APP_BASE_URL"),
  getEnvValue("NEXT_PUBLIC_APP_URL"),
  getEnvValue("VERCEL_PROJECT_PRODUCTION_URL"),
  getEnvValue("VERCEL_BRANCH_URL"),
  getEnvValue("VERCEL_URL"),
  ...configuredOrigins,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function toAllowedHost(value?: string | null) {
  const trimmed = sanitizeEnvValue(value);
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("*") || trimmed.includes("?")) {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  }

  const origin = normalizeOrigin(trimmed);
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

const trustedOrigins = Array.from(
  new Set(
    trustedOriginCandidates
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)),
  ),
);

const allowedHostCandidates = [
  ...trustedOriginCandidates,
  ...(getEnvValue("VERCEL") ? ["*.vercel.app"] : []),
];

const allowedHosts = Array.from(
  new Set(
    allowedHostCandidates
      .map((origin) => toAllowedHost(origin))
      .filter((origin): origin is string => Boolean(origin)),
  ),
);

export const auth = betterAuth({
  appName: "Career OS",
  baseURL: {
    allowedHosts,
    fallback: authBaseUrl,
  },
  basePath: "/api/auth",
  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
  trustedOrigins,
  secret: betterAuthSecret,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  account: {
    updateAccountOnSignIn: true,
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            scope: ["openid", "email", "profile"],
          },
        }
      : {},
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    storage: "memory",
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "career-os",
    trustedProxyHeaders: true,
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  plugins: [
    twoFactor({
      issuer: "Career OS",
    }),
    nextCookies(),
  ],
});

let authMigrationPromise: Promise<void> | null = null;

export function ensureAuthTables() {
  if (!authMigrationPromise) {
    authMigrationPromise = Promise.resolve().then(async () => {
      await initializeSchema();
    });
  }

  return authMigrationPromise;
}

