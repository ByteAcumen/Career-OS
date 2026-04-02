import type { AiProvider, AiProviderSource } from "@/lib/types";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secret-vault";

type ProviderState = {
  available: boolean;
  source: AiProviderSource;
  saved: boolean;
  hint: string | null;
};

const providers: AiProvider[] = ["openai", "gemini", "openrouter"];

export function saveAiCredential(userId: string, provider: AiProvider, apiKey: string) {
  const normalized = apiKey.trim();

  db.prepare(
    `INSERT INTO user_ai_credentials
      (userId, provider, encryptedApiKey, keyHint, updatedAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(userId, provider) DO UPDATE SET
      encryptedApiKey = excluded.encryptedApiKey,
      keyHint = excluded.keyHint,
      updatedAt = CURRENT_TIMESTAMP`,
  ).run(userId, provider, encryptSecret(normalized), maskSecret(normalized));
}

export function deleteAiCredential(userId: string, provider: AiProvider) {
  db.prepare(
    `DELETE FROM user_ai_credentials
     WHERE userId = ? AND provider = ?`,
  ).run(userId, provider);
}

export function getAiCredential(userId: string, provider: AiProvider) {
  const row = db
    .prepare(
      `SELECT encryptedApiKey
       FROM user_ai_credentials
       WHERE userId = ? AND provider = ?`,
    )
    .get(userId, provider) as { encryptedApiKey?: string } | undefined;

  if (!row?.encryptedApiKey) {
    return null;
  }

  return decryptSecret(row.encryptedApiKey);
}

export function getAiProviderStatus(userId: string) {
  const rows = db
    .prepare(
      `SELECT provider, keyHint
       FROM user_ai_credentials
       WHERE userId = ?`,
    )
    .all(userId) as Array<{ provider: AiProvider; keyHint: string | null }>;

  const stored = new Map(rows.map((row) => [row.provider, row]));

  return providers.reduce(
    (acc, provider) => {
      const envKey = getEnvKey(provider);
      const hasServerKey = Boolean(process.env[envKey]);
      const savedRow = stored.get(provider);
      const hasUserKey = Boolean(savedRow);

      const state: ProviderState = {
        available: hasUserKey || hasServerKey,
        source: hasUserKey ? "user" : hasServerKey ? "server" : "none",
        saved: hasUserKey,
        hint: savedRow?.keyHint ?? null,
      };

      acc.providers[provider] = state.available;
      acc.providerSources[provider] = state.source;
      acc.savedApiKeys[provider] = state.saved;
      acc.providerHints[provider] = state.hint;
      return acc;
    },
    {
      providers: {
        openai: false,
        gemini: false,
        openrouter: false,
      } as Record<AiProvider, boolean>,
      providerSources: {
        openai: "none",
        gemini: "none",
        openrouter: "none",
      } as Record<AiProvider, AiProviderSource>,
      savedApiKeys: {
        openai: false,
        gemini: false,
        openrouter: false,
      } as Record<AiProvider, boolean>,
      providerHints: {
        openai: null,
        gemini: null,
        openrouter: null,
      } as Record<AiProvider, string | null>,
    },
  );
}

export function resolveAiProviderKey(userId: string, provider: AiProvider) {
  const stored = getAiCredential(userId, provider);
  if (stored) {
    return stored;
  }

  const envKey = getEnvKey(provider);
  const fallback = process.env[envKey]?.trim();
  return fallback || null;
}

function getEnvKey(provider: AiProvider) {
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "gemini") return "GEMINI_API_KEY";
  return "OPENROUTER_API_KEY";
}
