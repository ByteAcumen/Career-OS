"use server";

import { generateWeaknessCurriculum, predictApplicationMatch } from "@/lib/ai";
import { getServerSession } from "@/lib/auth-session";

export async function getWeaknessCurriculumAction() {
  try {
    const session = await getServerSession();
    if (!session) {
      throw new Error("You need to sign in first.");
    }

    const curriculum = await generateWeaknessCurriculum(session.user.id);
    return { ok: true, curriculum };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function predictMatchAction(company: string, role: string) {
  try {
    const session = await getServerSession();
    if (!session) {
      throw new Error("You need to sign in first.");
    }

    const data = await predictApplicationMatch(session.user.id, company, role);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
