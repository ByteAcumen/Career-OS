import { NextResponse } from "next/server";

import { saveReview, updateCheckin } from "@/lib/dashboard";
import { checkinSchema, reviewSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json();

  if ("key" in body) {
    const payload = checkinSchema.parse(body);
    return NextResponse.json(updateCheckin(payload.dateKey, payload.key, payload.value));
  }

  const review = reviewSchema.parse(body);
  return NextResponse.json(saveReview(review.dateKey, review.note, review.tomorrowTask));
}
