type ResumeFileNameOptions = {
  userName: string;
  company?: string | null;
  targetRole?: string | null;
  extension: "pdf" | "tex" | "md";
};

export function buildResumeFileName(options: ResumeFileNameOptions) {
  const parts = [
    slugifySegment(options.userName || "career-os-student"),
    options.company ? slugifySegment(options.company) : null,
    options.targetRole ? slugifySegment(options.targetRole) : "resume",
  ].filter((value): value is string => Boolean(value));

  return `${parts.join("_")}.${options.extension}`;
}

function slugifySegment(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned || "resume";
}
