import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

import { getEnvValue } from "@/lib/env";

// Cached at module level — scryptSync is CPU-heavy (intentionally), computing it
// on every decrypt call wastes 50–200ms per AI request. Derive once at startup.
let _cachedVaultKey: Buffer | null = null;

function getVaultKey(): Buffer {
  if (_cachedVaultKey) return _cachedVaultKey;

  const secret = getEnvValue("BETTER_AUTH_SECRET");
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to protect stored secrets.");
  }

  _cachedVaultKey = scryptSync(secret, "career-os-secret-vault", 32) as Buffer;
  return _cachedVaultKey;
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(payload: string) {
  const [iv, tag, encrypted] = payload.split(".");
  if (!iv || !tag || !encrypted) {
    throw new Error("Stored secret payload is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getVaultKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 6) {
    return "saved";
  }

  return `${trimmed.slice(0, 3)}...${trimmed.slice(-4)}`;
}
