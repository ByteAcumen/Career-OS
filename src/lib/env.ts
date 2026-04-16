import { z } from "zod";

// ---------------------------------------------------------------------------
// Startup environment validation
// Fails immediately at server start with a clear message if required vars are
// missing, instead of throwing cryptic errors mid-request.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Required
  TURSO_DATABASE_URL: z.string().url("TURSO_DATABASE_URL must be a valid URL"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Optional — AI providers (at least one should be set for AI features)
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Optional — integrations
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Optional — seeding
  APP_SEED_NAME: z.string().optional(),
  APP_SEED_EMAIL: z.string().email().optional(),
  APP_SEED_PASSWORD: z.string().optional(),

  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function sanitizeEnvValue(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = stripWrappingQuotes(value);
  return normalized.length > 0 ? normalized : null;
}

export function getEnvValue(name: string) {
  return sanitizeEnvValue(process.env[name]) ?? undefined;
}

export function getEnvValues(name: string) {
  const raw = getEnvValue(name);
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((value) => sanitizeEnvValue(value))
    .filter((value): value is string => Boolean(value));
}

// Validate on module load (server-side only). Client bundles don't import this.
// Only validate in Node.js environments, not during edge/browser builds.
if (typeof process !== "undefined" && process.env.TURSO_DATABASE_URL) {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      `\n[Career OS] Invalid environment variables:\n${issues}\n\nCheck your .env file against .env.example.\n`,
    );
  }
}
