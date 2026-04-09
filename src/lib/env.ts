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
