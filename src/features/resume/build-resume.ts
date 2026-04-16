import type { DashboardData } from "@/lib/types";

type ResumeOptions = {
  user: {
    name?: string | null;
    email: string;
  };
  targetRole?: string | null;
  company?: string | null;
  jobDescription?: string | null;
  emphasis?: "balanced" | "projects" | "dsa";
};

type ResumeLink = {
  label: string;
  url: string;
};

type ResumeProject = {
  title: string;
  subtitle: string;
  bullets: string[];
  link?: string | null;
};

type ResumeDraft = {
  mode: "deterministic";
  generatedAt: string;
  targetRole: string;
  company: string | null;
  matchedKeywords: string[];
  header: {
    name: string;
    email: string;
    title: string;
    education: string | null;
    links: ResumeLink[];
  };
  summaryBullets: string[];
  focusAreas: string[];
  projectHighlights: ResumeProject[];
  problemSolvingHighlights: string[];
  editingNotes: string[];
  markdown: string;
  latex: string;
};

const TECH_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "among",
  "build",
  "built",
  "career",
  "company",
  "could",
  "daily",
  "deliver",
  "engineering",
  "experience",
  "focus",
  "good",
  "high",
  "into",
  "just",
  "make",
  "more",
  "most",
  "need",
  "next",
  "only",
  "role",
  "student",
  "system",
  "team",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "using",
  "week",
  "with",
  "work",
]);

export function buildResumeDraft(
  dashboard: DashboardData,
  options: ResumeOptions,
): ResumeDraft {
  const targetRole =
    options.targetRole?.trim() || dashboard.settings.targetRole || "Software Engineer";
  const company = options.company?.trim() || null;
  const keywords = extractKeywords([
    options.jobDescription ?? "",
    options.company ?? "",
    options.targetRole ?? "",
  ]);
  const links = buildLinks(dashboard.settings);
  const scoredBuilds = scoreBuilds(dashboard, keywords, options.emphasis ?? "balanced");
  const projectHighlights = scoredBuilds.slice(0, 3).map((entry) => buildProjectHighlight(entry));
  const focusAreas = buildFocusAreas(dashboard, keywords);
  const problemSolvingHighlights = buildProblemSolvingHighlights(dashboard, keywords);
  const summaryBullets = buildSummaryBullets(
    dashboard,
    targetRole,
    company,
    focusAreas,
    keywords,
    projectHighlights.length,
  );
  const education = buildEducationLine(dashboard.settings);
  const editingNotes = buildEditingNotes(dashboard, projectHighlights.length, keywords);
  const header = {
    name: options.user.name?.trim() || "Career OS Student",
    email: options.user.email,
    title: targetRole,
    education,
    links,
  };

  return {
    mode: "deterministic",
    generatedAt: new Date().toISOString(),
    targetRole,
    company,
    matchedKeywords: keywords,
    header,
    summaryBullets,
    focusAreas,
    projectHighlights,
    problemSolvingHighlights,
    editingNotes,
    markdown: renderResumeMarkdown({
      header,
      summaryBullets,
      focusAreas,
      projectHighlights,
      problemSolvingHighlights,
      editingNotes,
    }),
    latex: renderResumeLatex({
      header,
      summaryBullets,
      focusAreas,
      projectHighlights,
      problemSolvingHighlights,
    }),
  };
}

function buildLinks(settings: DashboardData["settings"]) {
  const rawLinks: ResumeLink[] = [
    { label: "GitHub", url: settings.githubUrl },
    { label: "LeetCode", url: settings.leetcodeUrl },
    { label: "LinkedIn", url: settings.linkedinUrl },
    { label: "Portfolio", url: settings.portfolioUrl },
    { label: "Resume", url: settings.resumeUrl },
    { label: "Codeforces", url: settings.codeforcesUrl },
    { label: "CodeChef", url: settings.codechefUrl },
    { label: "HackerRank", url: settings.hackerrankUrl },
  ];

  return rawLinks.filter((link) => Boolean(link.url));
}

function buildEducationLine(settings: DashboardData["settings"]) {
  const parts = [settings.university, settings.degree, settings.graduationYear]
    .map((value) => value.trim())
    .filter(Boolean);

  return parts.length ? parts.join(" | ") : null;
}

function buildFocusAreas(dashboard: DashboardData, keywords: string[]) {
  const areaCounts = new Map<string, number>();

  for (const build of dashboard.recentBuilds) {
    registerFocusValue(areaCounts, build.area);
    registerFocusValue(areaCounts, build.title);
  }

  for (const dsa of dashboard.recentDsa) {
    registerFocusValue(areaCounts, dsa.pattern);
  }

  for (const keyword of keywords) {
    if (keyword.length >= 4) {
      areaCounts.set(keyword, (areaCounts.get(keyword) ?? 0) + 3);
    }
  }

  return [...areaCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label)
    .slice(0, 8);
}

function registerFocusValue(areaCounts: Map<string, number>, value: string) {
  for (const token of tokenize(value)) {
    if (token.length < 3 || TECH_STOP_WORDS.has(token)) continue;
    areaCounts.set(token, (areaCounts.get(token) ?? 0) + 1);
  }
}

function scoreBuilds(
  dashboard: DashboardData,
  keywords: string[],
  emphasis: NonNullable<ResumeOptions["emphasis"]>,
) {
  const buildWeight = emphasis === "projects" ? 5 : 2;
  const dsaWeight = emphasis === "dsa" ? 1 : 2;

  return [...dashboard.recentBuilds]
    .map((entry, index) => {
      const text = [entry.title, entry.area, entry.proof, entry.impact].filter(Boolean).join(" ");
      return {
        ...entry,
        score:
          scoreText(text, keywords) * buildWeight +
          Math.max(0, 8 - index) +
          (entry.impact ? 4 : 0) +
          (entry.proof ? 2 : 0) +
          dsaWeight,
      };
    })
    .sort((left, right) => right.score - left.score || right.createdAt.localeCompare(left.createdAt));
}

function buildProjectHighlight(
  entry: DashboardData["recentBuilds"][number] & { score: number },
): ResumeProject {
  const bullets = [
    normalizeSentence(
      `Shipped ${entry.title} with visible product work in ${entry.area || "a focused engineering area"}.`,
    ),
    entry.proof ? normalizeSentence(entry.proof) : null,
    entry.impact ? normalizeSentence(entry.impact) : null,
    entry.repositoryUrl
      ? "Maintained a reviewable code and proof trail through the linked repository."
      : null,
  ].filter((bullet): bullet is string => Boolean(bullet));

  return {
    title: entry.title,
    subtitle: entry.area || "Product build",
    bullets: uniqueStrings(bullets).slice(0, 3),
    link: entry.repositoryUrl,
  };
}

function buildProblemSolvingHighlights(dashboard: DashboardData, keywords: string[]) {
  const scoredEntries = [...dashboard.recentDsa]
    .map((entry, index) => ({
      ...entry,
      score:
        scoreText([entry.title, entry.pattern, entry.insight ?? ""].join(" "), keywords) +
        Math.max(0, 6 - index) +
        (entry.insight ? 2 : 0),
    }))
    .sort((left, right) => right.score - left.score);

  return scoredEntries.slice(0, 4).map((entry) =>
    normalizeSentence(
      entry.insight
        ? `${entry.pattern} / ${entry.difficulty}: ${entry.insight}`
        : `Solved ${entry.difficulty.toLowerCase()} ${entry.pattern} problems, including ${entry.title}.`,
    ),
  );
}

function buildSummaryBullets(
  dashboard: DashboardData,
  targetRole: string,
  company: string | null,
  focusAreas: string[],
  keywords: string[],
  projectCount: number,
) {
  const summary = [
    normalizeSentence(
      `${dashboard.settings.degree ? "Final-year" : "Focused"} CS student targeting ${targetRole}${
        company ? ` roles at ${company}` : ""
      } with consistent DSA practice, shipped product work, and deliberate application momentum.`,
    ),
    normalizeSentence(
      `Recent work emphasizes ${formatList(focusAreas.slice(0, 4)) || "product execution and problem solving"} across ${projectCount || 1} resume-worthy build tracks and ${dashboard.recentDsa.length} logged DSA checkpoints.`,
    ),
  ];

  if (keywords.length > 0) {
    summary.push(
      normalizeSentence(
        `This draft is biased toward ${formatList(keywords.slice(0, 5))} so tailoring starts from the strongest matching evidence already stored in Career OS.`,
      ),
    );
  } else if (dashboard.settings.weeklyTheme.trim()) {
    summary.push(
      normalizeSentence(
        `Current weekly theme: ${dashboard.settings.weeklyTheme}. The draft keeps that thread visible without turning the resume into a journal.`,
      ),
    );
  }

  return summary.slice(0, 3);
}

function buildEditingNotes(
  dashboard: DashboardData,
  projectCount: number,
  keywords: string[],
) {
  const notes = [
    projectCount === 0
      ? "Log at least one shipped build with proof and impact so the projects section becomes stronger."
      : "Replace generic verbs with stack-specific nouns once you choose the target posting.",
    dashboard.settings.resumeUrl
      ? "Compare this draft against your saved resume link and pull over any quantified outcomes that are stronger."
      : "If you have an older resume, merge its best quantified outcomes into the bullets below.",
    keywords.length
      ? `Mirror the exact phrasing from the job description for ${formatList(keywords.slice(0, 4))} where it is truthful.`
      : "Paste a job description into the resume API later to bias project ordering toward the role.",
  ];

  return notes.filter(Boolean);
}

function renderResumeMarkdown(input: {
  header: ResumeDraft["header"];
  summaryBullets: string[];
  focusAreas: string[];
  projectHighlights: ResumeProject[];
  problemSolvingHighlights: string[];
  editingNotes: string[];
}) {
  const lines: string[] = [];

  lines.push(`# ${input.header.name}`);
  lines.push(input.header.title);
  lines.push(input.header.email);
  if (input.header.education) {
    lines.push(input.header.education);
  }
  if (input.header.links.length) {
    lines.push(input.header.links.map((link) => `[${link.label}](${link.url})`).join(" | "));
  }

  lines.push("", "## Summary");
  for (const bullet of input.summaryBullets) {
    lines.push(`- ${bullet}`);
  }

  lines.push("", "## Focus Areas");
  lines.push(input.focusAreas.join(" | "));

  lines.push("", "## Selected Projects");
  for (const project of input.projectHighlights) {
    lines.push(`### ${project.title}`);
    lines.push(project.subtitle);
    if (project.link) {
      lines.push(project.link);
    }
    for (const bullet of project.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
  }

  lines.push("## Problem Solving");
  for (const bullet of input.problemSolvingHighlights) {
    lines.push(`- ${bullet}`);
  }

  lines.push("", "## Editing Notes");
  for (const note of input.editingNotes) {
    lines.push(`- ${note}`);
  }

  return lines.join("\n").trim();
}

function renderResumeLatex(input: {
  header: ResumeDraft["header"];
  summaryBullets: string[];
  focusAreas: string[];
  projectHighlights: ResumeProject[];
  problemSolvingHighlights: string[];
}) {
  const lines: string[] = [
    "\\documentclass[10pt]{article}",
    "\\usepackage[margin=0.7in]{geometry}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{enumitem}",
    "\\setlist[itemize]{leftmargin=1.1em,itemsep=0.25em,topsep=0.3em}",
    "\\pagestyle{empty}",
    "\\begin{document}",
    `\\begin{center}{\\LARGE \\textbf{${latexEscape(input.header.name)}}}\\\\[0.15cm]`,
    `${latexEscape(input.header.title)} \\\\`,
    `${latexEscape(input.header.email)}`,
  ];

  if (input.header.links.length) {
    lines.push("\\\\");
    lines.push(
      input.header.links
        .map((link) => `\\href{${latexEscape(link.url)}}{${latexEscape(link.label)}}`)
        .join(" $\\vert$ "),
    );
  }

  if (input.header.education) {
    lines.push("\\\\");
    lines.push(latexEscape(input.header.education));
  }

  lines.push("\\end{center}");
  lines.push("\\section*{Summary}");
  lines.push("\\begin{itemize}");
  for (const bullet of input.summaryBullets) {
    lines.push(`\\item ${latexEscape(bullet)}`);
  }
  lines.push("\\end{itemize}");

  lines.push("\\section*{Focus Areas}");
  lines.push(latexEscape(input.focusAreas.join(" | ")));

  lines.push("\\section*{Selected Projects}");
  for (const project of input.projectHighlights) {
    lines.push(`\\textbf{${latexEscape(project.title)}} \\hfill ${latexEscape(project.subtitle)}\\\\`);
    if (project.link) {
      lines.push(`\\href{${latexEscape(project.link)}}{${latexEscape(project.link)}}\\\\`);
    }
    lines.push("\\begin{itemize}");
    for (const bullet of project.bullets) {
      lines.push(`\\item ${latexEscape(bullet)}`);
    }
    lines.push("\\end{itemize}");
  }

  lines.push("\\section*{Problem Solving}");
  lines.push("\\begin{itemize}");
  for (const bullet of input.problemSolvingHighlights) {
    lines.push(`\\item ${latexEscape(bullet)}`);
  }
  lines.push("\\end{itemize}");
  lines.push("\\end{document}");

  return lines.join("\n");
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractKeywords(texts: string[]) {
  const counts = new Map<string, number>();

  for (const text of texts) {
    for (const token of tokenize(text)) {
      if (token.length < 3 || TECH_STOP_WORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token)
    .slice(0, 8);
}

function scoreText(text: string, keywords: string[]) {
  const tokens = new Set(tokenize(text));
  return keywords.reduce((score, keyword) => score + (tokens.has(keyword) ? 3 : 0), 0);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeSentence(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function formatList(values: string[]) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function latexEscape(value: string) {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
