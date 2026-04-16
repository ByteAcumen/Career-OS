import { Buffer } from "node:buffer";

import mammoth from "mammoth";
import { extractText } from "unpdf";

export type ParsedResumeUpload = {
  fileName: string;
  contentType: string;
  format: "pdf" | "docx" | "text" | "latex";
  sizeBytes: number;
  extractedText: string;
  extractedCharacterCount: number;
  detectedLinks: string[];
  detectedSections: string[];
  totalPages: number | null;
  warnings: string[];
};

const MAX_RESUME_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 18_000;
const LINK_PATTERN = /https?:\/\/[^\s)]+/gi;
const SECTION_PATTERNS = [
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "achievements",
  "certifications",
  "problem solving",
  "leetcode",
  "competitive programming",
] as const;

export async function parseUploadedResume(file: File): Promise<ParsedResumeUpload> {
  validateResumeFile(file);

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const normalizedName = file.name.trim() || "resume";
  const extension = normalizedName.split(".").pop()?.toLowerCase() ?? "";
  const warnings: string[] = [];

  let format: ParsedResumeUpload["format"] = "text";
  let extractedText = "";
  let totalPages: number | null = null;

  if (isPdfFile(file.type, extension)) {
    format = "pdf";
    const extracted = await extractText(bytes, { mergePages: true });
    extractedText = extracted.text;
    totalPages = extracted.totalPages;
  } else if (isDocxFile(file.type, extension)) {
    format = "docx";
    const extracted = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    extractedText = extracted.value;
    if (extracted.messages.length > 0) {
      warnings.push(...extracted.messages.map((entry) => `${entry.type}: ${entry.message}`));
    }
  } else if (extension === "tex") {
    format = "latex";
    extractedText = decodeTextFile(bytes);
  } else {
    format = "text";
    extractedText = decodeTextFile(bytes);
  }

  const normalizedText = normalizeExtractedResumeText(extractedText);
  if (!normalizedText) {
    throw new Error("The uploaded resume did not contain readable text.");
  }

  return {
    fileName: normalizedName,
    contentType: file.type || inferContentType(extension),
    format,
    sizeBytes: file.size,
    extractedText: normalizedText,
    extractedCharacterCount: normalizedText.length,
    detectedLinks: Array.from(new Set(normalizedText.match(LINK_PATTERN) ?? [])).slice(0, 20),
    detectedSections: detectSections(normalizedText),
    totalPages,
    warnings: warnings.slice(0, 8),
  };
}

function validateResumeFile(file: File) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("A valid resume file is required.");
  }

  if (file.size <= 0) {
    throw new Error("The uploaded resume file is empty.");
  }

  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    throw new Error("Resume uploads must be 5 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx", "txt", "md", "tex"].includes(extension)) {
    throw new Error("Supported resume formats are PDF, DOCX, TXT, MD, and TEX.");
  }
}

function isPdfFile(contentType: string, extension: string) {
  return contentType === "application/pdf" || extension === "pdf";
}

function isDocxFile(contentType: string, extension: string) {
  return (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  );
}

function inferContentType(extension: string) {
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "md":
      return "text/markdown";
    case "tex":
      return "application/x-tex";
    default:
      return "text/plain";
  }
}

function decodeTextFile(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function normalizeExtractedResumeText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

function detectSections(text: string) {
  const lower = text.toLowerCase();
  return SECTION_PATTERNS.filter((section) => lower.includes(section)).slice(0, 8);
}
