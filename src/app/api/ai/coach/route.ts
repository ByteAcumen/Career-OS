import { NextResponse } from "next/server";

import { generateCoachResponse } from "@/lib/ai";
import { saveCoachResponse } from "@/lib/dashboard";
import { toDateKey } from "@/lib/utils";

export async function POST() {
  try {
    const coach = await generateCoachResponse();
    saveCoachResponse(toDateKey(), coach);

    return NextResponse.json({ ok: true, coach });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "AI coach failed",
      },
      { status: 500 },
    );
  }
}
