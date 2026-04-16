import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { listAssistantConversations } from "@/lib/assistant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conversations = await listAssistantConversations(session.user.id);
  return NextResponse.json({ conversations });
}
