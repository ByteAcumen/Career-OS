"use server";

import { generateWeaknessCurriculum, predictApplicationMatch } from "@/lib/ai";

export async function getWeaknessCurriculumAction() {
  try {
    const curriculum = await generateWeaknessCurriculum();
    return { ok: true, curriculum };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function predictMatchAction(company: string, role: string) {
  try {
    const data = await predictApplicationMatch(company, role);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
