import type { ResumeRequestInput } from "@/features/resume/contracts";
import { ResumeRequestSchema } from "@/features/resume/contracts";
import {
  parseUploadedResume,
  type ParsedResumeUpload,
} from "@/features/resume/parse-uploaded-resume";

export type ParsedResumeRequest = {
  input: ResumeRequestInput;
  upload: ParsedResumeUpload | null;
};

export async function readResumeGenerationRequest(
  request: Request,
): Promise<ParsedResumeRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const fileEntry = form.get("resume");
    const upload =
      fileEntry instanceof File && fileEntry.size > 0
        ? await parseUploadedResume(fileEntry)
        : null;

    const parsed = ResumeRequestSchema.safeParse({
      targetRole: readOptionalString(form.get("targetRole")),
      company: readOptionalString(form.get("company")),
      jobDescription: readOptionalString(form.get("jobDescription")),
      emphasis: readOptionalString(form.get("emphasis")),
      resumeText: readOptionalString(form.get("resumeText")) ?? upload?.extractedText,
      sourceFileName: readOptionalString(form.get("sourceFileName")) ?? upload?.fileName,
      optimizeWithAi: readOptionalBoolean(form.get("optimizeWithAi")),
    });

    if (!parsed.success) {
      throw new ResumeRequestValidationError(parsed.error.flatten());
    }

    return {
      input: parsed.data,
      upload,
    };
  }

  const rawBody = await request.json().catch(() => ({}));
  const parsed = ResumeRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    throw new ResumeRequestValidationError(parsed.error.flatten());
  }

  return {
    input: parsed.data,
    upload: null,
  };
}

export class ResumeRequestValidationError extends Error {
  flattened: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };

  constructor(flattened: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  }) {
    super("Invalid resume request.");
    this.name = "ResumeRequestValidationError";
    this.flattened = flattened;
  }
}

function readOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readOptionalBoolean(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return undefined;
}
