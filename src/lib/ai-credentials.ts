import type { AiProvider, AiProviderSource } from "@/lib/types";
import { client } from "@/lib/db";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secret-vault";

type ProviderState = {
  available: boolean;
  source: AiProviderSource;
  saved: boolean;
  hint: string | null;
};

// Short-lived cache: avoids DB round-trips on every AI call.
// Each message can trigger resolveAiProviderKey for up to 3 providers.
// 60-second TTL is safe — keys don't change mid-conversation.
type KeyCacheEntry = { key: string | null; expiresAt: number };
const keyCache = new Map<string, KeyCacheEntry>();

const providers: AiProvider[] = ["openai", "gemini", "openrouter", "groq"];

export async function saveAiCredential(userId: string, provider: AiProvider, apiKey: string) {
  const normalized = apiKey.trim();

  await client.execute({
    sql: `INSERT INTO user_ai_credentials
      (userId, provider, encryptedApiKey, keyHint, updatedAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(userId, provider) DO UPDATE SET
      encryptedApiKey = excluded.encryptedApiKey,
      keyHint = excluded.keyHint,
      updatedAt = CURRENT_TIMESTAMP`,
    args: [userId, provider, encryptSecret(normalized), maskSecret(normalized)],
  });

  // Invalidate cache so the new key is picked up immediately
  keyCache.delete(`${userId}:${provider}`);
}

export async function deleteAiCredential(userId: string, provider: AiProvider) {
  await client.execute({
    sql: `DELETE FROM user_ai_credentials
     WHERE userId = ? AND provider = ?`,
    args: [userId, provider],
  });

  // Invalidate cache after deleting
  keyCache.delete(`${userId}:${provider}`);
}

export async function getAiCredential(userId: string, provider: AiProvider) {
  const rs = await client.execute({
    sql: `SELECT encryptedApiKey
       FROM user_ai_credentials
       WHERE userId = ? AND provider = ?`,
    args: [userId, provider],
  });

  const row = rs.rows[0] as unknown as { encryptedApiKey?: string } | undefined;

  if (!row?.encryptedApiKey) {
    return null;
  }

  return decryptSecret(row.encryptedApiKey);
}

export async function getAiProviderStatus(userId: string) {
  const rs = await client.execute({
    sql: `SELECT provider, keyHint
       FROM user_ai_credentials
       WHERE userId = ?`,
    args: [userId],
  });

  const rows = rs.rows as unknown as Array<{ provider: AiProvider; keyHint: string | null }>;
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
        groq: false,
      } as Record<AiProvider, boolean>,
      providerSources: {
        openai: "none",
        gemini: "none",
        openrouter: "none",
        groq: "none",
      } as Record<AiProvider, AiProviderSource>,
      savedApiKeys: {
        openai: false,
        gemini: false,
        openrouter: false,
        groq: false,
      } as Record<AiProvider, boolean>,
      providerHints: {
        openai: null,
        gemini: null,
        openrouter: null,
        groq: null,
      } as Record<AiProvider, string | null>,
    },
  );
}

export async function resolveAiProviderKey(userId: string, provider: AiProvider) {
  const cacheKey = `${userId}:${provider}`;
  const cached = keyCache.get(cacheKey);

  // Return cached value if still fresh (60-second TTL)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  // Resolve from DB, fall back to server-level env key
  const stored = await getAiCredential(userId, provider);
  const envKey = getEnvKey(provider);
  const key = stored ?? process.env[envKey]?.trim() ?? null;

  // Cache for 60 seconds to eliminate repeated DB reads per conversation
  keyCache.set(cacheKey, { key, expiresAt: Date.now() + 60_000 });

  return key || null;
}

/** Check all providers and return the first one with a valid key */
export async function getFirstAvailableProvider(userId: string): Promise<AiProvider | null> {
  const order: AiProvider[] = ["gemini", "openai", "groq", "openrouter"];
  for (const provider of order) {
    const key = await resolveAiProviderKey(userId, provider);
    if (key) return provider;
  }
  return null;
}

function getEnvKey(provider: AiProvider) {
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "gemini") return "GEMINI_API_KEY";
  if (provider === "groq") return "GROQ_API_KEY";
  return "OPENROUTER_API_KEY";
}
