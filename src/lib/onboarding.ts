import "server-only";

import type { DashboardData } from "@/lib/types";
import { client } from "@/lib/db";

const onboardingFieldLabels = {
  primaryGoal: "Primary goal",
  targetRole: "Target role",
  linkedinUrl: "LinkedIn URL",
  jobTrackerUrl: "Job tracker URL",
  university: "University",
  planStyle: "Planning style",
} as const;

type RequiredOnboardingField = keyof typeof onboardingFieldLabels;

const requiredOnboardingFields = Object.keys(
  onboardingFieldLabels,
) as RequiredOnboardingField[];

type OnboardingSettingsSlice = Pick<
  DashboardData["settings"],
  RequiredOnboardingField
>;

function hasValue(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function getMissingOnboardingFields(
  settings: Partial<OnboardingSettingsSlice>,
) {
  return requiredOnboardingFields.filter((field) => !hasValue(settings[field]));
}

export function getOnboardingFieldLabels(fields: RequiredOnboardingField[]) {
  return fields.map((field) => onboardingFieldLabels[field]);
}

export async function isOnboardingComplete(userId: string) {
  const result = await client.execute({
    sql: `SELECT primaryGoal, targetRole, linkedinUrl, jobTrackerUrl, university, planStyle
      FROM app_settings
      WHERE userId = ?
      LIMIT 1`,
    args: [userId],
  });

  if (!result.rows[0]) {
    return false;
  }

  const row = result.rows[0] as unknown as Partial<OnboardingSettingsSlice>;
  return getMissingOnboardingFields(row).length === 0;
}

