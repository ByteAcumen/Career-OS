import type { DashboardData } from "@/lib/types";

export type ResumeMode = "deterministic" | "ai-optimized";
export type ResumeEmphasis = "balanced" | "projects" | "dsa";
export type ResumeTemplate = "sb2nov";

export type ResumeOptions = {
  user: {
    name?: string | null;
    email: string;
  };
  targetRole?: string | null;
  company?: string | null;
  jobDescription?: string | null;
  emphasis?: ResumeEmphasis;
  sourceResumeText?: string | null;
  sourceFileName?: string | null;
};

export type ResumeLink = {
  label: string;
  url: string;
};

export type ResumeSkillGroup = {
  label: string;
  items: string[];
};

export type ResumeProject = {
  title: string;
  subtitle: string;
  bullets: string[];
  link?: string | null;
};

export type ResumeDraft = {
  mode: ResumeMode;
  generatedAt: string;
  template: ResumeTemplate;
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
  skills: ResumeSkillGroup[];
  projectHighlights: ResumeProject[];
  problemSolvingHighlights: string[];
  editingNotes: string[];
  improvementSummary: string | null;
  importedResume: {
    used: boolean;
    fileName: string | null;
  };
  markdown: string;
  latex: string;
};

type ResumeRenderableSections = {
  header: ResumeDraft["header"];
  summaryBullets: string[];
  focusAreas: string[];
  skills: ResumeSkillGroup[];
  projectHighlights: ResumeProject[];
  problemSolvingHighlights: string[];
};

type ResumeEvidence = {
  bullets: string[];
};

type SkillDefinition = {
  label: string;
  items: Array<{
    name: string;
    aliases: string[];
  }>;
};

const TECH_STOP_WORDS = new Set([
  "and",
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
  "looking",
  "only",
  "planning",
  "product",
  "role",
  "roles",
  "software",
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
  "thinking",
  "using",
  "week",
  "with",
  "work",
]);

const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    label: "Languages",
    items: [
      { name: "TypeScript", aliases: ["typescript", "ts"] },
      { name: "JavaScript", aliases: ["javascript", "js"] },
      { name: "Python", aliases: ["python"] },
      { name: "Java", aliases: ["java"] },
      { name: "C++", aliases: ["c++", "cpp"] },
      { name: "C", aliases: [" c "] },
      { name: "Go", aliases: [" golang ", " go "] },
      { name: "Rust", aliases: ["rust"] },
      { name: "SQL", aliases: ["sql", "postgresql", "mysql", "sqlite", "turso"] },
    ],
  },
  {
    label: "Frameworks",
    items: [
      { name: "React", aliases: ["react"] },
      { name: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
      { name: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
      { name: "Express", aliases: ["express"] },
      { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
      { name: "REST APIs", aliases: ["rest api", "restful", "api route", "api routes"] },
      { name: "Authentication", aliases: ["oauth", "auth", "session", "better-auth", "better auth"] },
    ],
  },
  {
    label: "Data and Infra",
    items: [
      { name: "PostgreSQL", aliases: ["postgres", "postgresql"] },
      { name: "Turso / SQLite", aliases: ["turso", "sqlite"] },
      { name: "Redis", aliases: ["redis"] },
      { name: "Docker", aliases: ["docker"] },
      { name: "Vercel", aliases: ["vercel"] },
      { name: "GitHub Actions", aliases: ["github actions", "ci", "workflow"] },
      { name: "AWS", aliases: ["aws", "amazon web services"] },
      { name: "GCP", aliases: ["gcp", "google cloud"] },
    ],
  },
  {
    label: "AI and Product Systems",
    items: [
      { name: "OpenAI API", aliases: ["openai", "gpt", "responses api"] },
      { name: "Gemini API", aliases: ["gemini"] },
      { name: "Prompt Engineering", aliases: ["prompt", "prompting"] },
      { name: "Fallback Routing", aliases: ["fallback", "provider routing", "multi provider"] },
      { name: "Streaming UX", aliases: ["streaming", "stream"] },
      { name: "LLM Tooling", aliases: ["tool calling", "tool use", "structured output"] },
    ],
  },
];

export function buildResumeDraft(
  dashboard: DashboardData,
  options: ResumeOptions,
): ResumeDraft {
  const targetRole =
    options.targetRole?.trim() || dashboard.settings.targetRole || "Software Engineer";
  const company = options.company?.trim() || null;
  const emphasis = options.emphasis ?? "balanced";
  const sourceResumeText = cleanResumeSourceText(options.sourceResumeText);
  const evidence = extractResumeEvidence(sourceResumeText);
  const keywords = extractKeywords([
    options.jobDescription ?? "",
    options.company ?? "",
    options.targetRole ?? "",
    sourceResumeText ?? "",
  ]);
  const links = buildLinks(dashboard.settings);
  const skills = buildSkillGroups(
    dashboard,
    keywords,
    options.jobDescription ?? "",
    sourceResumeText,
  );
  const scoredBuilds = scoreBuilds(dashboard, keywords, emphasis, sourceResumeText);
  const projectHighlights = scoredBuilds
    .slice(0, emphasis === "projects" ? 4 : 3)
    .map((entry) => buildProjectHighlight(entry, evidence));
  const focusAreas = buildFocusAreas(dashboard, keywords, skills, sourceResumeText);
  const problemSolvingHighlights = buildProblemSolvingHighlights(dashboard, keywords);
  const summaryBullets = buildSummaryBullets(
    dashboard,
    targetRole,
    company,
    focusAreas,
    skills,
    keywords,
    projectHighlights.length,
    Boolean(sourceResumeText),
  );
  const education = buildEducationLine(dashboard.settings);
  const editingNotes = buildEditingNotes(
    dashboard,
    projectHighlights.length,
    keywords,
    Boolean(sourceResumeText),
    skills,
  );
  const header = {
    name: options.user.name?.trim() || "Career OS Student",
    email: options.user.email,
    title: targetRole,
    education,
    links,
  };

  return finalizeResumeDraft({
    mode: "deterministic",
    generatedAt: new Date().toISOString(),
    template: "sb2nov",
    targetRole,
    company,
    matchedKeywords: keywords,
    header,
    summaryBullets,
    focusAreas,
    skills,
    projectHighlights,
    problemSolvingHighlights,
    editingNotes,
    improvementSummary: sourceResumeText
      ? "Imported an existing resume so stronger evidence and stack signals can be preserved in this draft."
      : null,
    importedResume: {
      used: Boolean(sourceResumeText),
      fileName: options.sourceFileName?.trim() || null,
    },
  });
}

export function composeResumeDraft(
  baseDraft: ResumeDraft,
  overrides: Partial<
    Pick<
      ResumeDraft,
      | "mode"
      | "generatedAt"
      | "template"
      | "matchedKeywords"
      | "summaryBullets"
      | "focusAreas"
      | "skills"
      | "projectHighlights"
      | "problemSolvingHighlights"
      | "editingNotes"
      | "improvementSummary"
      | "importedResume"
    >
  >,
): ResumeDraft {
  return finalizeResumeDraft({
    mode: overrides.mode ?? baseDraft.mode,
    generatedAt: overrides.generatedAt ?? new Date().toISOString(),
    template: overrides.template ?? baseDraft.template,
    targetRole: baseDraft.targetRole,
    company: baseDraft.company,
    matchedKeywords: uniqueStrings(overrides.matchedKeywords ?? baseDraft.matchedKeywords).slice(0, 12),
    header: baseDraft.header,
    summaryBullets: uniqueStrings(overrides.summaryBullets ?? baseDraft.summaryBullets).slice(0, 4),
    focusAreas: uniqueStrings(overrides.focusAreas ?? baseDraft.focusAreas).slice(0, 10),
    skills: normalizeSkillGroups(overrides.skills ?? baseDraft.skills).slice(0, 6),
    projectHighlights: normalizeProjects(overrides.projectHighlights ?? baseDraft.projectHighlights).slice(
      0,
      4,
    ),
    problemSolvingHighlights: uniqueStrings(
      overrides.problemSolvingHighlights ?? baseDraft.problemSolvingHighlights,
    ).slice(0, 5),
    editingNotes: uniqueStrings(overrides.editingNotes ?? baseDraft.editingNotes).slice(0, 6),
    improvementSummary:
      overrides.improvementSummary === undefined
        ? baseDraft.improvementSummary
        : overrides.improvementSummary,
    importedResume: overrides.importedResume ?? baseDraft.importedResume,
  });
}

export function renderResumeMarkdown(input: ResumeRenderableSections) {
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

  lines.push("", "## Projects");
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

  if (input.problemSolvingHighlights.length) {
    lines.push("## Problem Solving");
    for (const bullet of input.problemSolvingHighlights) {
      lines.push(`- ${bullet}`);
    }
    lines.push("");
  }

  if (input.skills.length) {
    lines.push("## Technical Skills");
    for (const group of input.skills) {
      lines.push(`- **${group.label}:** ${group.items.join(", ")}`);
    }
  }

  return lines.join("\n").trim();
}

export function renderResumeLatex(input: ResumeRenderableSections) {
  const lines: string[] = [
    "%-------------------------",
    "% Resume in Latex",
    "% Generated by Career OS",
    "% Based on the open-source sb2nov/resume structure",
    "%------------------------",
    "",
    "\\documentclass[letterpaper,11pt]{article}",
    "\\usepackage{latexsym}",
    "\\usepackage[empty]{fullpage}",
    "\\usepackage{titlesec}",
    "\\usepackage[dvipsnames]{xcolor}",
    "\\usepackage{enumitem}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{fancyhdr}",
    "",
    "\\pagestyle{fancy}",
    "\\fancyhf{}",
    "\\fancyfoot{}",
    "\\renewcommand{\\headrulewidth}{0pt}",
    "\\renewcommand{\\footrulewidth}{0pt}",
    "",
    "\\addtolength{\\oddsidemargin}{-0.375in}",
    "\\addtolength{\\evensidemargin}{-0.375in}",
    "\\addtolength{\\textwidth}{1in}",
    "\\addtolength{\\topmargin}{-.5in}",
    "\\addtolength{\\textheight}{1.0in}",
    "",
    "\\urlstyle{same}",
    "\\raggedbottom",
    "\\raggedright",
    "\\setlength{\\tabcolsep}{0in}",
    "",
    "\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]",
    "\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}",
    "\\newcommand{\\resumeHeading}[2]{\\textbf{#1}\\hfill #2\\\\}",
    "\\newcommand{\\resumeSubheading}[1]{\\textit{\\small #1}\\\\}",
    "",
    "\\begin{document}",
    "",
    "\\begin{center}",
    `{\\Large \\textbf{${latexEscape(input.header.name)}}}\\\\`,
    `${latexEscape(input.header.title)}\\\\`,
    `${latexEscape(input.header.email)}\\\\`,
  ];

  if (input.header.links.length) {
    lines.push(
      input.header.links
        .map((link) => `\\href{${latexEscapeUrl(link.url)}}{${latexEscape(link.label)}}`)
        .join(" $\\vert$ ") + "\\\\",
    );
  }

  lines.push("\\end{center}", "");

  if (input.header.education) {
    lines.push("\\section{Education}");
    lines.push("\\begin{itemize}[leftmargin=*]");
    lines.push(`\\resumeItem{${latexEscape(input.header.education)}}`);
    lines.push("\\end{itemize}", "");
  }

  lines.push("\\section{Summary}");
  lines.push("\\begin{itemize}[leftmargin=*]");
  for (const bullet of input.summaryBullets) {
    lines.push(`\\resumeItem{${latexEscape(bullet)}}`);
  }
  lines.push("\\end{itemize}", "");

  lines.push("\\section{Projects}");
  for (const project of input.projectHighlights) {
    const rightText = project.link
      ? `\\href{${latexEscapeUrl(project.link)}}{Repository}`
      : "";
    lines.push(`\\resumeHeading{${latexEscape(project.title)}}{${rightText}}`);
    lines.push(`\\resumeSubheading{${latexEscape(project.subtitle)}}`);
    lines.push("\\begin{itemize}[leftmargin=*]");
    for (const bullet of project.bullets) {
      lines.push(`\\resumeItem{${latexEscape(bullet)}}`);
    }
    lines.push("\\end{itemize}");
  }
  lines.push("");

  if (input.problemSolvingHighlights.length) {
    lines.push("\\section{Problem Solving}");
    lines.push("\\begin{itemize}[leftmargin=*]");
    for (const bullet of input.problemSolvingHighlights) {
      lines.push(`\\resumeItem{${latexEscape(bullet)}}`);
    }
    lines.push("\\end{itemize}", "");
  }

  if (input.skills.length) {
    lines.push("\\section{Technical Skills}");
    lines.push("\\begin{itemize}[leftmargin=*]");
    for (const group of input.skills) {
      lines.push(
        `\\item \\small{\\textbf{${latexEscape(group.label)}}: ${latexEscape(group.items.join(", "))}}`,
      );
    }
    lines.push("\\end{itemize}", "");
  }

  lines.push("\\end{document}");
  return lines.join("\n");
}

function finalizeResumeDraft(
  input: Omit<ResumeDraft, "markdown" | "latex">,
): ResumeDraft {
  const sections: ResumeRenderableSections = {
    header: input.header,
    summaryBullets: uniqueStrings(input.summaryBullets).slice(0, 4),
    focusAreas: uniqueStrings(input.focusAreas).slice(0, 10),
    skills: normalizeSkillGroups(input.skills).slice(0, 6),
    projectHighlights: normalizeProjects(input.projectHighlights).slice(0, 4),
    problemSolvingHighlights: uniqueStrings(input.problemSolvingHighlights).slice(0, 5),
  };

  return {
    ...input,
    matchedKeywords: uniqueStrings(input.matchedKeywords).slice(0, 12),
    editingNotes: uniqueStrings(input.editingNotes).slice(0, 6),
    ...sections,
    markdown: renderResumeMarkdown(sections),
    latex: renderResumeLatex(sections),
  };
}

function normalizeProjects(projects: ResumeProject[]) {
  return projects
    .map((project) => ({
      title: project.title.trim(),
      subtitle: project.subtitle.trim() || "Project",
      link: project.link?.trim() || null,
      bullets: uniqueStrings(project.bullets.map((bullet) => normalizeSentence(bullet))).slice(0, 4),
    }))
    .filter((project) => project.title && project.bullets.length > 0);
}

function normalizeSkillGroups(groups: ResumeSkillGroup[]) {
  return groups
    .map((group) => ({
      label: group.label.trim(),
      items: uniqueStrings(group.items),
    }))
    .filter((group) => group.label && group.items.length > 0);
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

function buildFocusAreas(
  dashboard: DashboardData,
  keywords: string[],
  skills: ResumeSkillGroup[],
  sourceResumeText: string | null,
) {
  const areaCounts = new Map<string, number>();

  for (const build of dashboard.recentBuilds) {
    registerFocusValue(areaCounts, build.area);
    registerFocusValue(areaCounts, build.title);
  }

  for (const dsa of dashboard.recentDsa) {
    registerFocusValue(areaCounts, dsa.pattern);
  }

  for (const group of skills) {
    for (const item of group.items) {
      areaCounts.set(item.toLowerCase(), (areaCounts.get(item.toLowerCase()) ?? 0) + 3);
    }
  }

  for (const keyword of keywords) {
    if (keyword.length >= 4) {
      areaCounts.set(keyword, (areaCounts.get(keyword) ?? 0) + 3);
    }
  }

  if (sourceResumeText) {
    for (const token of tokenize(sourceResumeText).slice(0, 220)) {
      if (token.length < 3 || TECH_STOP_WORDS.has(token)) continue;
      areaCounts.set(token, (areaCounts.get(token) ?? 0) + 1);
    }
  }

  return [...areaCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => humanizeFocusArea(label))
    .filter(Boolean)
    .slice(0, 8);
}

function registerFocusValue(areaCounts: Map<string, number>, value: string) {
  for (const token of tokenize(value)) {
    if (token.length < 3 || TECH_STOP_WORDS.has(token)) continue;
    areaCounts.set(token, (areaCounts.get(token) ?? 0) + 1);
  }
}

function buildSkillGroups(
  dashboard: DashboardData,
  keywords: string[],
  jobDescription: string,
  sourceResumeText: string | null,
) {
  const signals = [
    jobDescription,
    sourceResumeText ?? "",
    dashboard.settings.customAiInstructions,
    dashboard.settings.primaryGoal,
    dashboard.settings.targetRole,
    dashboard.settings.weeklyTheme,
    ...dashboard.recentBuilds.map((entry) =>
      [entry.title, entry.area, entry.proof ?? "", entry.impact ?? ""].join(" "),
    ),
    ...dashboard.recentDsa.map((entry) => [entry.title, entry.pattern, entry.insight ?? ""].join(" ")),
  ]
    .join(" \n ")
    .toLowerCase();

  const groups: ResumeSkillGroup[] = [];

  for (const definition of SKILL_DEFINITIONS) {
    const items = definition.items
      .filter((item) => {
        if (keywords.some((keyword) => item.aliases.includes(keyword))) {
          return true;
        }

        return item.aliases.some((alias) => containsSkillAlias(signals, alias));
      })
      .map((item) => item.name)
      .slice(0, 8);

    if (items.length) {
      groups.push({ label: definition.label, items });
    }
  }

  if (!groups.length) {
    const fallback = keywords
      .map((keyword) => humanizeFocusArea(keyword))
      .filter(Boolean)
      .slice(0, 6);

    if (fallback.length) {
      groups.push({ label: "Tools and Topics", items: fallback });
    }
  }

  return groups.slice(0, 5);
}

function containsSkillAlias(haystack: string, alias: string) {
  const normalizedAlias = alias.toLowerCase();
  if (normalizedAlias.startsWith(" ") || normalizedAlias.endsWith(" ")) {
    return haystack.includes(normalizedAlias);
  }

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedAlias)}([^a-z0-9]|$)`, "i").test(
    haystack,
  );
}

function scoreBuilds(
  dashboard: DashboardData,
  keywords: string[],
  emphasis: ResumeEmphasis,
  sourceResumeText: string | null,
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
          scoreText(sourceResumeText ?? "", tokenize(entry.title).slice(0, 4)) +
          Math.max(0, 8 - index) +
          (entry.impact ? 4 : 0) +
          (entry.proof ? 3 : 0) +
          (entry.repositoryUrl ? 2 : 0) +
          dsaWeight,
      };
    })
    .sort((left, right) => right.score - left.score || right.createdAt.localeCompare(left.createdAt));
}

function buildProjectHighlight(
  entry: DashboardData["recentBuilds"][number] & { score: number },
  evidence: ResumeEvidence,
): ResumeProject {
  const supportBullets = selectSupportingResumeBullets(
    evidence.bullets,
    [entry.title, entry.area, entry.proof ?? "", entry.impact ?? ""].join(" "),
  );

  const bullets = [
    entry.proof
      ? normalizeSentence(entry.proof)
      : normalizeSentence(
          `Built ${entry.title} in ${entry.area || "a focused product engineering area"} with reviewable implementation details.`,
        ),
    entry.impact ? normalizeSentence(entry.impact) : null,
    ...supportBullets,
    entry.repositoryUrl
      ? "Maintained a public proof trail with repository history, implementation context, and shipped artifacts."
      : null,
  ].filter((bullet): bullet is string => Boolean(bullet));

  return {
    title: entry.title,
    subtitle: buildProjectSubtitle(entry),
    bullets: uniqueStrings(bullets).slice(0, 4),
    link: entry.repositoryUrl,
  };
}

function buildProjectSubtitle(entry: DashboardData["recentBuilds"][number]) {
  if (entry.area?.trim()) {
    return entry.area.trim();
  }

  return "Product build";
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
  skills: ResumeSkillGroup[],
  keywords: string[],
  projectCount: number,
  hasImportedResume: boolean,
) {
  const strongestSkills = skills.flatMap((group) => group.items).slice(0, 5);
  const summary = [
    normalizeSentence(
      `${dashboard.settings.degree ? "Final-year" : "Focused"} CS student targeting ${targetRole}${
        company ? ` roles at ${company}` : ""
      } with shipped engineering work, consistent DSA practice, and a clean proof-of-work trail across Career OS.`,
    ),
    normalizeSentence(
      `Recent work emphasizes ${formatList(focusAreas.slice(0, 4)) || "product execution and problem solving"} across ${
        projectCount || 1
      } resume-ready build tracks, supported by ${dashboard.recentDsa.length} logged problem-solving entries.`,
    ),
  ];

  if (strongestSkills.length > 0) {
    summary.push(
      normalizeSentence(
        `Core stack signals include ${formatList(strongestSkills)}, chosen from the tools and systems already evidenced in your logged work and uploaded resume material.`,
      ),
    );
  } else if (dashboard.settings.weeklyTheme.trim()) {
    summary.push(
      normalizeSentence(
        `Current weekly theme: ${dashboard.settings.weeklyTheme}. The draft keeps that thread visible without sounding generic.`,
      ),
    );
  }

  if (hasImportedResume) {
    summary.push(
      "An uploaded resume was used as supporting evidence so stronger existing bullets and terminology can be preserved where they remain truthful.",
    );
  }

  return summary.slice(0, 3);
}

function buildEditingNotes(
  dashboard: DashboardData,
  projectCount: number,
  keywords: string[],
  hasImportedResume: boolean,
  skills: ResumeSkillGroup[],
) {
  const flatSkills = skills.flatMap((group) => group.items).slice(0, 4);
  const notes = [
    projectCount === 0
      ? "Log at least one shipped build with proof and impact so the projects section becomes stronger."
      : "Before sending, replace any generic stack wording with the exact technologies that best match the posting.",
    hasImportedResume
      ? "Keep quantified bullets from the uploaded resume only when they still match your current truthful evidence."
      : dashboard.settings.resumeUrl
        ? "Compare this draft against your saved resume link and pull over any stronger quantified outcomes."
        : "If you already have an older resume, merge its best quantified outcomes into the strongest matching bullets.",
    keywords.length
      ? `Mirror the job description phrasing for ${formatList(keywords.slice(0, 4))} where it is truthful and visible in your work.`
      : "Paste a job description into the resume flow to bias project ordering and keyword coverage before exporting.",
    flatSkills.length
      ? `Verify the technical skills line reflects the tools you can actually defend in an interview: ${formatList(flatSkills)}.`
      : `Add more concrete stack details to recent build logs so the technical skills section becomes more specific.`,
  ];

  return notes.filter(Boolean).slice(0, 4);
}

function extractResumeEvidence(sourceResumeText: string | null): ResumeEvidence {
  if (!sourceResumeText) {
    return { bullets: [] };
  }

  const bullets = sourceResumeText
    .split("\n")
    .map((line) => line.replace(/^[\s\-*•]+/, "").trim())
    .filter((line) => line.length >= 28 && line.length <= 240)
    .filter((line) => /[a-z]/i.test(line))
    .filter((line) => !isLikelySectionHeading(line))
    .map((line) => normalizeSentence(line));

  return {
    bullets: uniqueStrings(bullets).slice(0, 24),
  };
}

function selectSupportingResumeBullets(bullets: string[], targetText: string) {
  const targetTokens = new Set(
    tokenize(targetText).filter((token) => token.length >= 3 && !TECH_STOP_WORDS.has(token)),
  );

  return bullets
    .map((bullet) => ({
      bullet,
      score: scoreEvidenceBullet(bullet, targetTokens),
    }))
    .filter((entry) => entry.score >= 2)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.bullet)
    .slice(0, 1);
}

function scoreEvidenceBullet(value: string, targetTokens: Set<string>) {
  const tokens = tokenize(value);
  let score = 0;

  for (const token of tokens) {
    if (targetTokens.has(token)) {
      score += 2;
    }
  }

  if (/\b\d+[%xkmb]?\b/i.test(value)) {
    score += 1;
  }

  return score;
}

function cleanResumeSourceText(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return null;
  return normalized.slice(0, 16_000);
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

function latexEscapeUrl(value: string) {
  return value.replace(/%/g, "\\%").replace(/#/g, "\\#").replace(/_/g, "\\_");
}

function humanizeFocusArea(value: string) {
  if (!value) return "";
  const known = SKILL_DEFINITIONS.flatMap((definition) => definition.items).find((item) =>
    item.aliases.includes(value.toLowerCase()),
  );
  if (known) {
    return known.name;
  }

  return value
    .split(/[\s._-]+/)
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function isLikelySectionHeading(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.length <= 18 && trimmed === trimmed.toUpperCase()) return true;
  return /^(summary|education|experience|projects|skills|achievements|certifications)$/i.test(
    trimmed,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
