import OpenAI from "openai";
import type { ParsedResumeData } from "./parse-resume-with-ai";

const SYSTEM_PROMPT = `
You are an elite technical career coach and resume writer.
Your job is to optimize the provided resume data against a specific Job Description.

Goal:
1. Maximize keyword matches for ATS systems.
2. Rewrite weak bullet points into the STAR format (Situation, Task, Action, Result).
   Formula: [Strong Action Verb] [What you built/did] [How you built it/tech] [Impact/Metric].
   Example: "Built backend API" -> "Designed and deployed RESTful APIs using Node.js and Express, reducing average latency by 45% for 10k daily active users."
3. If Career OS data (projects/DSA) is provided, intelligently weave the best points into the resume if they are relevant to the JD.

Output JSON strictly adhering to the ParsedResumeData format plus editing notes:
{
  "resume": { ...ParsedResumeData structure... },
  "matchedKeywords": ["React", "Kubernetes", ...],
  "editingNotes": ["Replaced generic verb with 'Architected'", ...]
}
Return ONLY valid JSON. No markdown wrappers like \`\`\`json.
`;

export type TailoredResumeOutput = {
  resume: ParsedResumeData;
  matchedKeywords: string[];
  editingNotes: string[];
};

export async function tailorResumeWithAi(
  parsedResume: ParsedResumeData | null,
  jobDescription: string,
  careerOSContext: unknown
): Promise<TailoredResumeOutput | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.warn("GROQ_API_KEY is missing. Tailoring skipped.");
    return null;
  }

  try {
    const openai = new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const prompt = `
=== Job Description ===
${jobDescription || "No specific JD provided. Optimize for general Software Engineering roles."}

=== User's Extracted Resume ===
${parsedResume ? JSON.stringify(parsedResume, null, 2) : "No resume uploaded."}

=== Career OS Logged Accomplishments ===
${JSON.stringify(careerOSContext, null, 2)}
`;

    const response = await openai.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    const result = JSON.parse(content);
    return result as TailoredResumeOutput;
  } catch (error) {
    console.error("Failed to tailor resume with AI:", error);
    return null;
  }
}
