import { format } from "date-fns";

import type { DashboardData, ScheduleBlock } from "@/lib/types";

type Settings = DashboardData["settings"];

export function getScheduleForDate(dateKey: string, settings: Settings): ScheduleBlock[] {
  const day = new Date(`${dateKey}T00:00:00`).getDay();
  const weekend = day === 0 || day === 6;

  if (weekend) {
    return [
      createBlock(dateKey, "morning-revision", "Morning revision", "Mandatory memory refresh and pattern recall.", "07:30", 30),
      createBlock(
        dateKey,
        "weekend-dsa",
        `DSA block (${settings.weekendDsaMinutes} min)`,
        "Timed medium plus one repeat pattern solve.",
        "09:30",
        settings.weekendDsaMinutes,
      ),
      createBlock(
        dateKey,
        "weekend-build",
        `Build block (${settings.weekendBuildMinutes} min)`,
        "Ship one visible feature to GitHub.",
        "14:00",
        settings.weekendBuildMinutes,
      ),
      createBlock(dateKey, "applications", "Applications", "Apply, follow up, or tighten resume bullets.", "17:30", 45),
      createBlock(dateKey, "weekly-review", "Weekly review", "Reset next week before sleep.", "20:30", 30),
    ];
  }

  return [
    createBlock(dateKey, "morning-revision", "Morning revision", "Non-negotiable daily recall before office.", "05:50", 45),
    createBlock(dateKey, "micro-revision", "Micro revision", "Flashcards or pattern replay only.", "13:15", 15),
    createBlock(dateKey, "deep-work", "Deep work", "DSA or product work depending on the day.", "20:45", 75),
    createBlock(dateKey, "support-block", "Support block", "Applications or DSA reinforcement.", "22:05", 35),
    createBlock(dateKey, "shutdown-review", "Shutdown review", "Save note and lock tomorrow's first task.", "22:40", 15),
  ];
}

function createBlock(
  dateKey: string,
  key: string,
  label: string,
  description: string,
  startTime: string,
  durationMinutes: number,
): ScheduleBlock {
  const start = buildLocalDate(dateKey, startTime);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return {
    key,
    label,
    description,
    timeLabel: format(start, "h:mm a"),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function buildLocalDate(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0);
}
