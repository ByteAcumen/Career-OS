import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getRequestSession } from "@/lib/auth-session";
import { saveReview, updateCheckin } from "@/lib/dashboard";
import { checkinSchema, reviewSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();

  if ("key" in body) {
    const payload = checkinSchema.parse(body);
    return NextResponse.json(
      await updateCheckin(session.user.id, payload.dateKey, payload.key, payload.value),
    );
  }

  const review = reviewSchema.parse(body);
  return NextResponse.json(
    await saveReview(session.user.id, review.dateKey, review.note, review.tomorrowTask),
  );
}
