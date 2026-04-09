import { getEnvValue, sanitizeEnvValue } from "@/lib/env";

const LOCAL_FALLBACK_URL = "http://localhost:3000";

function normalizeOriginCandidate(value?: string | null) {
  const trimmed = sanitizeEnvValue(value);
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export function normalizeOrigin(value?: string | null) {
  return normalizeOriginCandidate(value);
}

export function getConfiguredAppBaseUrl() {
  return (
    normalizeOriginCandidate(getEnvValue("BETTER_AUTH_URL")) ??
    normalizeOriginCandidate(getEnvValue("APP_BASE_URL")) ??
    normalizeOriginCandidate(getEnvValue("NEXT_PUBLIC_APP_URL")) ??
    normalizeOriginCandidate(getEnvValue("VERCEL_PROJECT_PRODUCTION_URL")) ??
    normalizeOriginCandidate(getEnvValue("VERCEL_URL")) ??
    LOCAL_FALLBACK_URL
  );
}

export function getClientAppBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return getConfiguredAppBaseUrl();
}
