import { NextResponse } from "next/server";

import { createApplicationEntry, ensureSettings, markApplicationSynced } from "@/lib/dashboard";
import { pushApplicationToSheet } from "@/lib/google-sheet";
import { applicationEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = applicationEntrySchema.parse(await request.json());
  const entry = createApplicationEntry(payload);

  // Auto-sync in background
  try {
    const settings = ensureSettings();
    if (settings.googleAppsScriptUrl) {
      pushApplicationToSheet(settings.googleAppsScriptUrl, {
        source: "career-tracker-app",
        date: entry.dateKey,
        company: entry.company,
        role: entry.role,
        status: entry.status,
        note: entry.note ?? "",
        roleUrl: entry.roleUrl ?? "",
        githubUrl: settings.githubUrl ?? "",
        createdAt: new Date().toISOString(),
      }).then(() => {
        markApplicationSynced(entry.id);
      }).catch((error) => console.error("Auto-sync failed", error));
    }
  } catch {
    // ignore
  }

  return NextResponse.json(entry);
}
