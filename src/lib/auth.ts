import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db, normalizeBetterAuthSqliteTables } from "@/lib/db";

const authBaseUrl = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
const configuredOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const trustedOrigins = Array.from(
  new Set([authBaseUrl, ...configuredOrigins, "http://localhost:3000", "http://127.0.0.1:3000"]),
);

const allowedHosts = Array.from(
  new Set(
    trustedOrigins
      .map((origin) => {
        try {
          return new URL(origin).host;
        } catch {
          return null;
        }
      })
      .filter((host): host is string => Boolean(host))
      .concat(["localhost:*", "127.0.0.1:*"]),
  ),
);

export const auth = betterAuth({
  appName: "Career OS",
  baseURL: {
    allowedHosts,
    fallback: authBaseUrl,
    protocol: authBaseUrl.startsWith("https://") ? "https" : "http",
  },
  basePath: "/api/auth",
  trustedOrigins,
  secret: process.env.BETTER_AUTH_SECRET,
  database: db,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
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
    storage: "database",
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
  plugins: [nextCookies()],
});

let authMigrationPromise: Promise<void> | null = null;

export function ensureAuthTables() {
  if (!authMigrationPromise) {
    authMigrationPromise = auth.$context.then(async (ctx) => {
      await ctx.runMigrations();
      normalizeBetterAuthSqliteTables();
    });
  }

  return authMigrationPromise;
}

void ensureAuthTables();
