import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function getVaultKey() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required to protect stored secrets.");
  }

  return scryptSync(secret, "career-os-secret-vault", 32);
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
