import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { newPassword, currentPassword } = body;

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 12) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters." },
        { status: 400 },
      );
    }

    if (currentPassword) {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        },
        headers: request.headers,
      });
    } else {
      await auth.api.setPassword({
        body: {
          newPassword,
        },
        headers: request.headers,
      });

      await auth.api.revokeOtherSessions({
        headers: request.headers,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
