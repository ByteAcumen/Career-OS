import {
  buildResumeDraft,
  type ResumeDraft,
} from "@/features/resume/build-resume";
import type { ParsedResumeUpload } from "@/features/resume/parse-uploaded-resume";
import type { ResumeRequestInput } from "@/features/resume/contracts";
import { optimizeResumeDraftWithAi } from "@/lib/ai";
import type { DashboardData } from "@/lib/types";

type GenerateResumeDraftOptions = {
  userId: string;
  dashboard: DashboardData;
  user: {
    name?: string | null;
    email: string;
  };
  input: ResumeRequestInput;
  upload?: ParsedResumeUpload | null;
};

export type GeneratedResumeResult = {
  resume: ResumeDraft;
  upload: ParsedResumeUpload | null;
  optimizedWithAi: boolean;
};

export async function generateResumeDraftForUser(
  options: GenerateResumeDraftOptions,
): Promise<GeneratedResumeResult> {
  const baseDraft = buildResumeDraft(options.dashboard, {
    user: options.user,
    targetRole: options.input.targetRole,
    company: options.input.company,
    jobDescription: options.input.jobDescription,
    emphasis: options.input.emphasis,
    sourceResumeText: options.input.resumeText ?? options.upload?.extractedText ?? null,
    sourceFileName: options.input.sourceFileName ?? options.upload?.fileName ?? null,
  });

  const shouldOptimize =
    options.input.optimizeWithAi !== false &&
    Boolean(options.input.jobDescription || options.input.resumeText || options.upload?.extractedText);

  if (!shouldOptimize) {
    return {
      resume: baseDraft,
      upload: options.upload ?? null,
      optimizedWithAi: false,
    };
  }

  try {
    const optimized = await optimizeResumeDraftWithAi({
      userId: options.userId,
      dashboard: options.dashboard,
      baseDraft,
      sourceResumeText: options.input.resumeText ?? options.upload?.extractedText,
      sourceFileName: options.input.sourceFileName ?? options.upload?.fileName,
      jobDescription: options.input.jobDescription,
    });

    return {
      resume: optimized,
      upload: options.upload ?? null,
      optimizedWithAi: true,
    };
  } catch (error) {
    console.warn(
      `[resume] AI optimization fallback triggered: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    return {
      resume: baseDraft,
      upload: options.upload ?? null,
      optimizedWithAi: false,
    };
  }
}
