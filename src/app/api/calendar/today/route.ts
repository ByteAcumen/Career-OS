import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { ensureSettings } from "@/lib/dashboard";
import { getScheduleForDate } from "@/lib/schedule";
import { toDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const settings = ensureSettings(session.user.id);
  const { searchParams } = new URL(request.url);
  const dateKey = searchParams.get("date") ?? toDateKey();
  const schedule = getScheduleForDate(dateKey, settings);

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career OS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Career OS Schedule",
    ...schedule.flatMap((item) => [
      "BEGIN:VEVENT",
      `UID:${item.key}-${dateKey}@career-os`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(new Date(item.startIso))}`,
      `DTEND:${toIcsDate(new Date(item.endIso))}`,
      `SUMMARY:${escapeText(item.label)}`,
      `DESCRIPTION:${escapeText(item.description)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="career-os-${dateKey}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

function toIcsDate(value: Date) {
  return [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate()),
    "T",
    pad(value.getUTCHours()),
    pad(value.getUTCMinutes()),
    pad(value.getUTCSeconds()),
    "Z",
  ].join("");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
