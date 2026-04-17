import { GoogleGenerativeAI } from "@google/generative-ai";

export type ParsedResumeData = {
  name: string;
  email: string;
  phone?: string;
  links: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    leetcode?: string;
  };
  education: {
    university: string;
    degree: string;
    gpa?: string;
    location?: string;
    year: string;
  };
  experience: {
    company: string;
    role: string;
    location?: string;
    dates: string;
    bullets: string[];
  }[];
  projects: {
    title: string;
    tech: string;
    link?: string;
    dates?: string;
    bullets: string[];
  }[];
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    concepts: string[];
  };
};

const SYSTEM_PROMPT = `
You are an expert technical recruiter parsing a raw resume dump.
Extract the information into the exact JSON structure provided.
Do NOT hallucinate information. If something is missing, leave it empty or omit it.
Ensure links are valid URLs. Return ONLY the raw JSON object.
`;

export async function parseResumeWithAi(rawText: string): Promise<ParsedResumeData | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn("GEMINI_API_KEY is missing. AI parsing skipped.");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `${SYSTEM_PROMPT}\n\nRaw Resume Text:\n${rawText}`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return JSON.parse(text) as ParsedResumeData;
  } catch (error) {
    console.error("Failed to parse resume with AI:", error);
    return null;
  }
}
// Forces Next.js Turbopack HMR cache update
