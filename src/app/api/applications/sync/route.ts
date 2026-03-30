import { NextResponse } from "next/server";

import {
  ensureSettings,
  getPendingApplicationsForSync,
  markApplicationSynced,
} from "@/lib/dashboard";
import { pushApplicationToSheet } from "@/lib/google-sheet";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const retryAfterSeconds = rateLimit(request, "sheet-sync", {
    limit: 4,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many sync attempts. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

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
