import { NextResponse } from "next/server";
import { client } from "@/lib/db";

// ---------------------------------------------------------------------------
// Cleanup cron — delete stale AI artifacts older than 30 days.
// Call this route from a Vercel cron job: schedule: "0 3 * * *" (3 AM daily)
// Or trigger manually: GET /api/cron/cleanup
//
// Protects the route with CRON_SECRET so it can't be abused publicly.
// Set CRON_SECRET in your environment variables.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, enforce it. Skip auth check in dev if not configured.
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Require secret in production even if not configured (fail safe)
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET environment variable is not set" },
      { status: 500 },
    );
  }

  try {
    // Delete AI artifacts not updated in the last 30 days
    const artifactsResult = await client.execute(
      `DELETE FROM ai_artifacts WHERE updatedAt < datetime('now', '-30 days')`,
    );

    const deleted =
      typeof artifactsResult.rowsAffected === "number" ? artifactsResult.rowsAffected : 0;

    console.log(`[Cron] Cleaned up ${deleted} stale AI artifacts`);

    return NextResponse.json({
      ok: true,
      cleaned: { aiArtifacts: deleted },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Cleanup failed:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
