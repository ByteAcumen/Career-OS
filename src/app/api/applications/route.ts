import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import {
  createApplicationEntry,
  ensureSettings,
  markApplicationSynced,
} from "@/lib/dashboard";
import { pushApplicationToSheet } from "@/lib/google-sheet";
import { applicationEntrySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const payload = applicationEntrySchema.parse(await request.json());
  const entry = await createApplicationEntry(session.user.id, payload);

  // Auto-sync in background
  try {
    const settings = await ensureSettings(session.user.id);
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
      })
        .then(async () => {
          await markApplicationSynced(session.user.id, entry.id);
        })
        .catch((error) => console.error("Auto-sync failed", error));
    }
  } catch {
    // ignore
  }

  return NextResponse.json(entry);
}
