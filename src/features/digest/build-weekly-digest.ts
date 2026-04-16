import type { DashboardData } from "@/lib/types";

type WeeklyDigestInput = {
  user: {
    name?: string | null;
    email: string;
  };
  appUrl?: string | null;
};

export type WeeklyDigest = {
  generatedAt: string;
  subject: string;
  preview: string;
  greeting: string;
  headline: string;
  metrics: Array<{
    label: string;
    value: string;
    context: string;
  }>;
  wins: string[];
  risks: string[];
  nextWeek: string[];
  recentWork: Array<{
    title: string;
    detail: string;
    type: "build" | "dsa" | "application";
    link?: string | null;
  }>;
  markdown: string;
  html: string;
};

export function buildWeeklyDigest(
  dashboard: DashboardData,
  input: WeeklyDigestInput,
): WeeklyDigest {
  const totalOutputs =
    dashboard.metrics.weekDsa + dashboard.metrics.weekBuilds + dashboard.metrics.weekApplications;
  const wins = buildWins(dashboard, totalOutputs);
  const risks = buildRisks(dashboard);
  const nextWeek = buildNextWeekPlan(dashboard);
  const recentWork = buildRecentWork(dashboard);
  const displayName = input.user.name?.trim() || "there";
  const headline =
    dashboard.settings.weeklyTheme.trim() ||
    `Protect the next week around ${dashboard.settings.targetRole.toLowerCase()} progress`;
  const metrics = [
    {
      label: "Current streak",
      value: `${dashboard.metrics.currentStreak} days`,
      context: "Visible proof-of-work streak",
    },
    {
      label: "Weekly outputs",
      value: String(totalOutputs),
      context: `${dashboard.metrics.weekDsa} DSA / ${dashboard.metrics.weekBuilds} builds / ${dashboard.metrics.weekApplications} applications`,
    },
    {
      label: "Open tasks",
      value: String(dashboard.planner.summary.active),
      context: `${dashboard.planner.summary.todayOpen} still compete for today's attention`,
    },
    {
      label: "Target hit",
      value: `${Math.round(
        (dashboard.metrics.targetProgress.dsa +
          dashboard.metrics.targetProgress.builds +
          dashboard.metrics.targetProgress.applications) /
          3,
      )}%`,
      context: "Average progress against weekly checkpoints",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    subject: `Career OS weekly digest - ${headline}`,
    preview: wins[0] || "A clean weekly summary of your recent momentum and next moves.",
    greeting: `Hi ${displayName},`,
    headline,
    metrics,
    wins,
    risks,
    nextWeek,
    recentWork,
    markdown: renderDigestMarkdown({
      displayName,
      headline,
      metrics,
      wins,
      risks,
      nextWeek,
      recentWork,
      appUrl: input.appUrl,
    }),
    html: renderDigestHtml({
      displayName,
      headline,
      metrics,
      wins,
      risks,
      nextWeek,
      recentWork,
      appUrl: input.appUrl,
    }),
  };
}

function buildWins(dashboard: DashboardData, totalOutputs: number) {
  const wins: string[] = [];

  if (dashboard.metrics.currentStreak > 0) {
    wins.push(`You protected a ${dashboard.metrics.currentStreak}-day visible-work streak.`);
  }
  if (dashboard.metrics.weekBuilds > 0) {
    wins.push(`You shipped ${dashboard.metrics.weekBuilds} build update(s), which keeps your portfolio from going stale.`);
  }
  if (dashboard.metrics.weekDsa > 0) {
    wins.push(`You logged ${dashboard.metrics.weekDsa} DSA checkpoint(s), so pattern recall is still active.`);
  }
  if (dashboard.metrics.weekApplications > 0) {
    wins.push(`You moved ${dashboard.metrics.weekApplications} application(s), which keeps the search measurable.`);
  }
  if (totalOutputs === 0) {
    wins.push("You still have a clean reset point this week, which is useful if you act early next week.");
  }

  return wins.slice(0, 4);
}

function buildRisks(dashboard: DashboardData) {
  const risks: string[] = [];

  if (dashboard.metrics.targetProgress.builds < 40) {
    risks.push("Build momentum is below target, so your resume may stop compounding if you do not ship visible proof next week.");
  }
  if (dashboard.metrics.targetProgress.applications < 40) {
    risks.push("Application volume is behind plan, which can create a strong prep loop but a weak interview pipeline.");
  }
  if (dashboard.planner.summary.active > dashboard.settings.weekendTaskTarget + 2) {
    risks.push("Too many active tasks are still open, which means next week can start fragmented instead of focused.");
  }
  if (!dashboard.today.tomorrowTask.trim()) {
    risks.push("There is no locked first task for tomorrow, so the next work block can leak into decision fatigue.");
  }
  if (risks.length === 0) {
    risks.push("No major structural risk stands out right now. The main job is to keep the cadence boring and repeatable.");
  }

  return risks.slice(0, 3);
}

function buildNextWeekPlan(dashboard: DashboardData) {
  const plans: string[] = [];
  const dsaGap = Math.max(0, dashboard.settings.weeklyDsaTarget - dashboard.metrics.weekDsa);
  const buildGap = Math.max(0, dashboard.settings.weeklyBuildTarget - dashboard.metrics.weekBuilds);
  const applicationGap = Math.max(
    0,
    dashboard.settings.weeklyApplicationTarget - dashboard.metrics.weekApplications,
  );

  if (buildGap > 0) {
    plans.push(`Schedule ${buildGap} more build proof checkpoint(s) and make the first one visible by midweek.`);
  }
  if (dsaGap > 0) {
    plans.push(`Recover the DSA gap with ${Math.min(dsaGap, 3)} targeted pattern sessions, not random solves.`);
  }
  if (applicationGap > 0) {
    plans.push(`Close the application gap with a focused company list and a fixed outreach block.`);
  }
  if (dashboard.planner.summary.active > 0) {
    plans.push(`Prune open tasks down to the next three that actually deserve carry-over.`);
  }
  if (!plans.length) {
    plans.push("Keep the same rhythm next week and spend the saved energy on sharper execution, not more planning.");
  }

  return plans.slice(0, 4);
}

function buildRecentWork(dashboard: DashboardData) {
  const recent = [
    ...dashboard.recentBuilds.slice(0, 2).map((entry) => ({
      title: entry.title,
      detail: entry.impact || entry.proof || entry.area,
      type: "build" as const,
      link: entry.repositoryUrl,
    })),
    ...dashboard.recentDsa.slice(0, 2).map((entry) => ({
      title: entry.title,
      detail: entry.insight || `${entry.difficulty} / ${entry.pattern}`,
      type: "dsa" as const,
      link: entry.repositoryUrl,
    })),
    ...dashboard.recentApplications.slice(0, 2).map((entry) => ({
      title: `${entry.role} - ${entry.company}`,
      detail: entry.note || entry.status,
      type: "application" as const,
      link: entry.roleUrl,
    })),
  ];

  return recent.slice(0, 5);
}

function renderDigestMarkdown(input: {
  displayName: string;
  headline: string;
  metrics: WeeklyDigest["metrics"];
  wins: string[];
  risks: string[];
  nextWeek: string[];
  recentWork: WeeklyDigest["recentWork"];
  appUrl?: string | null;
}) {
  const lines: string[] = [
    "# Career OS Weekly Digest",
    "",
    `Hi ${input.displayName},`,
    "",
    input.headline,
    "",
    "## Metrics",
  ];

  for (const metric of input.metrics) {
    lines.push(`- **${metric.label}:** ${metric.value} (${metric.context})`);
  }

  lines.push("", "## Wins");
  for (const win of input.wins) {
    lines.push(`- ${win}`);
  }

  lines.push("", "## Risks");
  for (const risk of input.risks) {
    lines.push(`- ${risk}`);
  }

  lines.push("", "## Next Week");
  for (const plan of input.nextWeek) {
    lines.push(`- ${plan}`);
  }

  lines.push("", "## Recent Work");
  for (const item of input.recentWork) {
    lines.push(`- **${item.title}** (${item.type}) - ${item.detail}`);
  }

  if (input.appUrl) {
    lines.push("", `[Open Career OS](${input.appUrl})`);
  }

  return lines.join("\n").trim();
}

function renderDigestHtml(input: {
  displayName: string;
  headline: string;
  metrics: WeeklyDigest["metrics"];
  wins: string[];
  risks: string[];
  nextWeek: string[];
  recentWork: WeeklyDigest["recentWork"];
  appUrl?: string | null;
}) {
  const metricCards = input.metrics
    .map(
      (metric) => `
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:16px;background:rgba(255,255,255,0.03)">
          <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8a92">${escapeHtml(metric.label)}</div>
          <div style="margin-top:10px;font-size:28px;font-weight:700;color:#ffffff">${escapeHtml(metric.value)}</div>
          <div style="margin-top:8px;font-size:13px;line-height:1.6;color:#a1a1aa">${escapeHtml(metric.context)}</div>
        </div>`,
    )
    .join("");

  const renderList = (title: string, items: string[]) => `
    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:22px;background:rgba(255,255,255,0.03)">
      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8a92">${escapeHtml(title)}</div>
      <ul style="margin:16px 0 0;padding-left:18px;color:#f4f4f5">
        ${items.map((item) => `<li style="margin:0 0 12px;line-height:1.7;color:#d4d4d8">${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>`;

  const workItems = input.recentWork
    .map(
      (item) => `
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:18px;background:rgba(255,255,255,0.03)">
          <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8a92">${escapeHtml(item.type)}</div>
          <div style="margin-top:10px;font-size:18px;font-weight:600;color:#ffffff">${escapeHtml(item.title)}</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.7;color:#d4d4d8">${escapeHtml(item.detail)}</div>
          ${item.link ? `<div style="margin-top:12px"><a href="${escapeHtml(item.link)}" style="color:#ffffff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.24)">Open link</a></div>` : ""}
        </div>`,
    )
    .join("");

  return `
    <div style="font-family:'Inter',system-ui,sans-serif;max-width:720px;margin:0 auto;padding:32px;background:#080808;color:#f4f4f5;border-radius:24px;border:1px solid rgba(255,255,255,0.08)">
      <div style="display:inline-flex;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a1a1aa;background:rgba(255,255,255,0.03)">Career OS weekly digest</div>
      <h1 style="margin:18px 0 10px;font-size:34px;line-height:1.05;color:#ffffff">Hi ${escapeHtml(input.displayName)},</h1>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.8;color:#d4d4d8">${escapeHtml(input.headline)}</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">${metricCards}</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px">
        ${renderList("Wins", input.wins)}
        ${renderList("Risks", input.risks)}
      </div>
      <div style="margin-top:18px">${renderList("Next week", input.nextWeek)}</div>
      <div style="margin-top:18px">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8a92;margin-bottom:12px">Recent work</div>
        <div style="display:grid;gap:12px">${workItems}</div>
      </div>
      ${
        input.appUrl
          ? `<div style="margin-top:26px"><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#ffffff;color:#080808;text-decoration:none;font-weight:600">Open Career OS</a></div>`
          : ""
      }
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
