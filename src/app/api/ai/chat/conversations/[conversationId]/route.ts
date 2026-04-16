import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth-session";
import { getAssistantConversation } from "@/lib/assistant";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const session = await getRequestSession(request);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId } = await context.params;
  const conversation = await getAssistantConversation(session.user.id, conversationId);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}
