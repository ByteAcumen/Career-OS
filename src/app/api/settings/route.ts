import { NextResponse } from "next/server";

import { saveSettings } from "@/lib/dashboard";
import { settingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = settingsSchema.parse(await request.json());
  return NextResponse.json(saveSettings(payload));
}
