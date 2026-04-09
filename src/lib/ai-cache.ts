import { createHash } from "node:crypto";

import { client } from "@/lib/db";
import { z } from "zod";

export type AiArtifactFeature =
  | "motivation"
  | "insight"
  | "weakness"
  | "match"
  | "coach"
  | "strategy"
  | "planner";

type ReadAiArtifactOptions<T extends z.ZodTypeAny> = {
  userId: string;
  feature: AiArtifactFeature;
  fingerprint: string;
  schema: T;
  maxAgeMinutes: number;
};

function sortForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForStableJson);
  }

  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortForStableJson(entryValue)]),
    );
  }

  return value;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortForStableJson(value));
}

export function createAiFingerprint(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function parseSqlTimestampToMs(value: string | null | undefined) {
  if (!value) return 0;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function readAiArtifact<T extends z.ZodTypeAny>({
  userId,
  feature,
  fingerprint,
  schema,
  maxAgeMinutes,
}: ReadAiArtifactOptions<T>): Promise<z.infer<T> | null> {
  const rs = await client.execute({
    sql: `SELECT payload, updatedAt
          FROM ai_artifacts
          WHERE userId = ?1 AND feature = ?2 AND fingerprint = ?3
          LIMIT 1`,
    args: [userId, feature, fingerprint],
  });

  const row = rs.rows[0] as { payload?: string | null; updatedAt?: string | null } | undefined;
  if (!row?.payload) {
    return null;
  }

  const updatedAtMs = parseSqlTimestampToMs(row.updatedAt);
  const maxAgeMs = maxAgeMinutes * 60_000;
  if (!updatedAtMs || Date.now() - updatedAtMs > maxAgeMs) {
    return null;
  }

  try {
    return schema.parse(JSON.parse(row.payload));
  } catch {
    return null;
  }
}

export async function writeAiArtifact(options: {
  userId: string;
  feature: AiArtifactFeature;
  fingerprint: string;
  provider: string;
  model: string;
  payload: unknown;
}) {
  await client.execute({
    sql: `INSERT INTO ai_artifacts (
            userId,
            feature,
            fingerprint,
            provider,
            model,
            payload
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
          ON CONFLICT(userId, feature, fingerprint)
          DO UPDATE SET
            provider = excluded.provider,
            model = excluded.model,
            payload = excluded.payload,
            updatedAt = CURRENT_TIMESTAMP`,
    args: [
      options.userId,
      options.feature,
      options.fingerprint,
      options.provider,
      options.model,
      stableJsonStringify(options.payload),
    ],
  });
}
