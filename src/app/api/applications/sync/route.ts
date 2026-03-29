import { NextResponse } from "next/server";

import {
  ensureSettings,
  getPendingApplicationsForSync,
  markApplicationSynced,
} from "@/lib/dashboard";
import { pushApplicationToSheet } from "@/lib/google-sheet";

export async function POST() {
  const settings = await ensureSettings();

  if (!settings.googleAppsScriptUrl) {
    return NextResponse.json(
      { ok: false, message: "Google Apps Script URL is not configured." },
      { status: 400 },
    );
  }

  const pending = getPendingApplicationsForSync();

  let syncedCount = 0;

  for (const item of pending) {
    await pushApplicationToSheet(settings.googleAppsScriptUrl, {
      source: "career-tracker-app",
      date: item.snapshotDateKey,
      company: item.company,
      role: item.role,
      status: item.status,
      note: item.note ?? "",
      roleUrl: item.roleUrl ?? "",
      githubUrl: settings.githubUrl ?? "",
      createdAt: item.createdAt,
    });

    markApplicationSynced(item.id);
    syncedCount += 1;
  }

  return NextResponse.json({ ok: true, syncedCount });
}
