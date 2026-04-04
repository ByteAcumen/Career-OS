import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db, initializeSchema } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import * as schema from "@/lib/schema";

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
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      // Fire-and-forget to avoid timing attacks
      void sendPasswordResetEmail(user.email, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
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
  plugins: [nextCookies()],
});

let authMigrationPromise: Promise<void> | null = null;

export function ensureAuthTables() {
  if (!authMigrationPromise) {
    authMigrationPromise = Promise.resolve().then(async () => {
      // Ensure app tables are created in Turso
      await initializeSchema();
      
      // Note: Better Auth tables are managed via the drizzleAdapter during usage,
      // but we ensure the app schema is ready here.
    });
  }

  return authMigrationPromise;
}
