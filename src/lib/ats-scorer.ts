/**
 * ats-scorer.ts — deterministic, client-safe ATS resume scorer.
 *
 * No external API or AI calls. Pure string analysis.
 * Returns a total score (0-100) plus a breakdown per category.
 */

export type AtsScoreBreakdown = {
  label: string;
  score: number;
  max: number;
  detail: string;
  tips: string[];
};

export type AtsScoreResult = {
  total: number;        // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  breakdown: AtsScoreBreakdown[];
};

// ─── Action words commonly rewarded by ATS ───────────────────────────────────
const ACTION_VERBS = new Set([
  "built", "shipped", "designed", "implemented", "developed", "led", "launched",
  "optimized", "reduced", "improved", "increased", "created", "architected",
  "engineered", "delivered", "collaborated", "integrated", "automated",
  "maintained", "refactored", "deployed", "solved", "analyzed", "researched",
  "documented", "tested", "debugged", "migrated", "scaled", "secured",
  "reviewed", "mentored", "contributed", "published", "achieved",
]);

// ─── Required section headings for ATS parsers ───────────────────────────────
const REQUIRED_SECTIONS = [
  { name: "summary", aliases: ["summary", "objective", "profile", "about"] },
  { name: "skills", aliases: ["skills", "focus areas", "technical skills", "technologies", "competencies"] },
  { name: "projects", aliases: ["projects", "selected projects", "experience", "work experience"] },
  { name: "education", aliases: ["education", "degree", "university", "academics"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function countMatches(haystack: string[], needles: string[]): number {
  const set = new Set(haystack);
  return needles.filter((n) => set.has(n)).length;
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "have",
  "will", "are", "was", "been", "its", "our", "you", "can", "not",
  "but", "all", "they", "their", "who", "what", "when", "into",
  "more", "than", "just", "also", "some", "any", "each",
]);

function extractJdKeywords(jd: string): string[] {
  const tokens = tokenize(jd).filter((t) => !STOP_WORDS.has(t));
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([t]) => t);
}

// ─── Individual scorers ───────────────────────────────────────────────────────

function scoreKeywords(resumeText: string, jd: string): AtsScoreBreakdown {
  if (!jd.trim()) {
    return {
      label: "Keyword Match",
      score: 20, // neutral — no JD provided
      max: 40,
      detail: "No job description provided — paste one for accurate keyword analysis.",
      tips: ["Paste a job description to get a real keyword match score."],
    };
  }

  const jdKeywords = extractJdKeywords(jd);
  const resumeTokens = tokenize(resumeText);
  const matched = countMatches(resumeTokens, jdKeywords);
  const ratio = jdKeywords.length > 0 ? matched / jdKeywords.length : 0;
  const score = Math.round(Math.min(40, ratio * 40));

  const missingTop = jdKeywords.filter((k) => !new Set(resumeTokens).has(k)).slice(0, 5);

  return {
    label: "Keyword Match",
    score,
    max: 40,
    detail: `${matched} of ${jdKeywords.length} key JD terms found in your resume (${Math.round(ratio * 100)}%).`,
    tips:
      missingTop.length
        ? [`Add these missing terms where truthful: ${missingTop.join(", ")}.`]
        : ["Strong keyword coverage — mirror exact phrasing from the JD."],
  };
}

function scoreStructure(resumeText: string): AtsScoreBreakdown {
  const lower = resumeText.toLowerCase();
  const found = REQUIRED_SECTIONS.filter((s) => s.aliases.some((a) => lower.includes(a)));
  const score = Math.round((found.length / REQUIRED_SECTIONS.length) * 20);
  const missing = REQUIRED_SECTIONS.filter((s) => !s.aliases.some((a) => lower.includes(a)));

  return {
    label: "Structure",
    score,
    max: 20,
    detail: `${found.length} of ${REQUIRED_SECTIONS.length} required sections detected.`,
    tips: missing.length
      ? [`Add these sections: ${missing.map((s) => s.name).join(", ")}.`]
      : ["All standard ATS sections are present."],
  };
}

function scoreQuantification(resumeText: string): AtsScoreBreakdown {
  // Count bullets with numbers / % / x (multiplier)
  const bulletLines = resumeText.split("\n").filter((l) => /^\s*[-•*]/.test(l));
  if (!bulletLines.length) {
    return {
      label: "Quantification",
      score: 0,
      max: 20,
      detail: "No bullet points detected in the resume.",
      tips: ["Add bullet-point accomplishments with measurable results."],
    };
  }

  const quantified = bulletLines.filter((l) => /\d+[%x]?|\d+\.\d+|[+]\d+|\$\d+/i.test(l)).length;
  const ratio = quantified / bulletLines.length;
  const score = Math.round(Math.min(20, ratio * 20));

  return {
    label: "Quantification",
    score,
    max: 20,
    detail: `${quantified} of ${bulletLines.length} bullets contain measurable outcomes (${Math.round(ratio * 100)}%).`,
    tips:
      ratio < 0.5
        ? ["Add numbers, percentages, or scale to at least 50% of your bullets."]
        : ["Good quantification — keep adding metrics wherever possible."],
  };
}

function scoreActionVerbs(resumeText: string): AtsScoreBreakdown {
  const bulletLines = resumeText.split("\n").filter((l) => /^\s*[-•*]/.test(l));
  if (!bulletLines.length) {
    return {
      label: "Action Verbs",
      score: 0,
      max: 10,
      detail: "No bullet points detected.",
      tips: ["Start each bullet with a strong action verb."],
    };
  }

  const startsWithAction = bulletLines.filter((l) => {
    const firstWord = l.replace(/^\s*[-•*]\s*/, "").split(/\s+/)[0]?.toLowerCase() ?? "";
    return ACTION_VERBS.has(firstWord);
  }).length;

  const ratio = startsWithAction / bulletLines.length;
  const score = Math.round(Math.min(10, ratio * 10));

  return {
    label: "Action Verbs",
    score,
    max: 10,
    detail: `${startsWithAction} of ${bulletLines.length} bullets start with a strong action verb.`,
    tips:
      ratio < 0.7
        ? ["Replace weak openers with verbs like: built, shipped, reduced, optimized, led."]
        : ["Strong verb usage — ATS parsers treat this as a positive signal."],
  };
}

function scoreLength(resumeText: string): AtsScoreBreakdown {
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  // ATS sweet spot: 400–800 words for a single-page resume
  let score = 10;
  let detail = `${wordCount} words — ideal range for ATS is 400–800.`;
  const tips: string[] = [];

  if (wordCount < 250) {
    score = 3;
    tips.push("Resume is very sparse. Add more detail to projects and bullet points.");
  } else if (wordCount < 400) {
    score = 6;
    tips.push("Resume could be longer. Expand project bullet points with more context.");
  } else if (wordCount > 900) {
    score = 6;
    detail = `${wordCount} words — may be too long for a single-page ATS scan.`;
    tips.push("Consider condensing to keep within one page (~600–800 words).") ;
  } else {
    tips.push("Good length for ATS parsing.");
  }

  return { label: "Content Length", score, max: 10, detail, tips };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function scoreAts(resumeMarkdown: string, jobDescription = ""): AtsScoreResult {
  const breakdown: AtsScoreBreakdown[] = [
    scoreKeywords(resumeMarkdown, jobDescription),
    scoreStructure(resumeMarkdown),
    scoreQuantification(resumeMarkdown),
    scoreActionVerbs(resumeMarkdown),
    scoreLength(resumeMarkdown),
  ];

  const total = Math.min(100, breakdown.reduce((sum, b) => sum + b.score, 0));

  let grade: AtsScoreResult["grade"] = "F";
  if (total >= 85) grade = "A";
  else if (total >= 70) grade = "B";
  else if (total >= 55) grade = "C";
  else if (total >= 40) grade = "D";

  const summary =
    total >= 85
      ? "Excellent — this resume should pass most ATS filters without issues."
      : total >= 70
      ? "Good — minor tweaks to keyword coverage will further improve pass rates."
      : total >= 55
      ? "Average — focus on quantification and keyword matching before applying."
      : "Needs work — add metrics, structure, and mirror keywords from the job description.";

  return { total, grade, summary, breakdown };
}

export function openInOverleaf(latexContent: string): void {
  // Overleaf "Open in Overleaf" POST API
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://www.overleaf.com/docs";
  form.target = "_blank";
  form.style.display = "none";

  const nameInput = document.createElement("input");
  nameInput.type = "hidden";
  nameInput.name = "snip_name";
  nameInput.value = "career-os-resume.tex";

  const snipInput = document.createElement("input");
  snipInput.type = "hidden";
  snipInput.name = "snip";
  snipInput.value = latexContent;

  form.appendChild(nameInput);
  form.appendChild(snipInput);
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
