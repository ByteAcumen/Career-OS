"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ResumeEmphasis = "balanced" | "projects" | "dsa";
type TabId = "preview" | "markdown" | "latex";

type ResumeDraft = {
  mode: string;
  generatedAt: string;
  template?: string;
  targetRole: string;
  company: string | null;
  matchedKeywords: string[];
  header: {
    name: string;
    email: string;
    title: string;
    education: string | null;
    links: { label: string; url: string }[];
  };
  summaryBullets: string[];
  focusAreas: string[];
  skills?: {
    label: string;
    items: string[];
  }[];
  projectHighlights: {
    title: string;
    subtitle: string;
    bullets: string[];
    link?: string | null;
  }[];
  problemSolvingHighlights: string[];
  editingNotes: string[];
  improvementSummary: string | null;
  importedResume: { used: boolean; fileName: string | null };
  markdown: string;
  latex: string;
};

type ApiResult = {
  resume: ResumeDraft;
  optimizedWithAi: boolean;
  upload?: {
    fileName: string;
    format: string;
    extractedCharacterCount: number;
    detectedSections: string[];
    warnings: string[];
  } | null;
  downloads: {
    markdownFileName: string;
    latexFileName: string;
    pdfFileName: string;
  };
};

type Props = {
  userName: string;
  userEmail: string;
};

const emphasisOptions: { value: ResumeEmphasis; label: string; desc: string }[] =
  [
    { value: "balanced", label: "Balanced", desc: "Mix of projects & DSA" },
    { value: "projects", label: "Projects-first", desc: "Prioritise build work" },
    { value: "dsa", label: "DSA-heavy", desc: "Emphasise problem solving" },
  ];

export function ResumeBuilder({}: Props) {
  // Form state
  const [targetRole, setTargetRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [emphasis, setEmphasis] = useState<ResumeEmphasis>("balanced");
  const [optimizeWithAi, setOptimizeWithAi] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Result state
  const [result, setResult] = useState<ApiResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── File handling ───────────────────────────────────────────────────────────
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadedFile(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  }, []);

  // ─── Generate ────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      let body: FormData | string;
      let contentType: string | undefined;

      if (uploadedFile) {
        const fd = new FormData();
        fd.append("file", uploadedFile);
        if (targetRole) fd.append("targetRole", targetRole);
        if (company) fd.append("company", company);
        if (jobDescription) fd.append("jobDescription", jobDescription);
        fd.append("emphasis", emphasis);
        fd.append("optimizeWithAi", String(optimizeWithAi));
        body = fd;
      } else {
        body = JSON.stringify({
          targetRole: targetRole || undefined,
          company: company || undefined,
          jobDescription: jobDescription || undefined,
          emphasis,
          optimizeWithAi,
        });
        contentType = "application/json";
      }

      const res = await fetch("/api/ai/resume", {
        method: "POST",
        headers: contentType ? { "Content-Type": contentType } : undefined,
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate resume");
      }

      const data: ApiResult = await res.json();
      setResult(data);
      setActiveTab("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ─── Download PDF ────────────────────────────────────────────────────────────
  async function handleDownloadPdf() {
    if (!result) return;
    setPdfLoading(true);

    try {
      const res = await fetch("/api/ai/resume/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: result.resume }),
      });

      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.downloads.pdfFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setPdfLoading(false);
    }
  }

  // ─── Download text files ─────────────────────────────────────────────────────
  function handleDownloadText(content: string, filename: string, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Copy ────────────────────────────────────────────────────────────────────
  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // ─── UI helpers ──────────────────────────────────────────────────────────────
  const inputCls =
    "w-full rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-[var(--muted)] focus:border-white/[0.18] focus:outline-none focus:ring-0 transition";
  const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* ── Left panel: Config ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Header card */}
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[13px] border border-white/[0.08] bg-white/[0.05]">
              <FileText className="size-4 text-white" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">Resume Generator</div>
              <div className="text-[11px] text-[var(--muted)]">Built from your logged Career OS work</div>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Target Role */}
            <div>
              <label className={labelCls}>Target Role</label>
              <input
                className={inputCls}
                placeholder="e.g. Software Engineer, Backend SDE"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            {/* Company */}
            <div>
              <label className={labelCls}>Company (optional)</label>
              <input
                className={inputCls}
                placeholder="e.g. Google, Zepto, startup"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Job Description */}
            <div>
              <label className={labelCls}>Job Description (optional)</label>
              <textarea
                className={cn(inputCls, "h-28 resize-none")}
                placeholder="Paste the JD here to bias keyword extraction and project ordering..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              {jobDescription && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400/80">
                  <CheckCircle2 className="size-3" />
                  <span>{jobDescription.split(/\s+/).length} words — keywords will be extracted</span>
                </div>
              )}
            </div>

            {/* Emphasis */}
            <div>
              <label className={labelCls}>Emphasis</label>
              <div className="grid grid-cols-3 gap-2">
                {emphasisOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEmphasis(opt.value)}
                    className={cn(
                      "rounded-[12px] border px-2 py-2.5 text-center transition",
                      emphasis === opt.value
                        ? "border-white/[0.22] bg-white/[0.09] text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-[var(--muted)] hover:border-white/[0.12] hover:text-white"
                    )}
                  >
                    <div className="text-[12px] font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[10px] opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upload existing resume */}
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Upload className="size-3.5 text-[var(--muted)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Upload Existing Resume
            </span>
            <span className="ml-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              Optional
            </span>
          </div>

          {uploadedFile ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-3">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-white">{uploadedFile.name}</div>
                <div className="text-[11px] text-[var(--muted)]">
                  {(uploadedFile.size / 1024).toFixed(0)} KB — Will be parsed & merged
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="shrink-0 rounded-full p-1 text-[var(--muted)] hover:text-white transition"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed py-7 transition",
                isDragging
                  ? "border-white/30 bg-white/[0.05]"
                  : "border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.03]"
              )}
            >
              <Upload className="size-5 text-[var(--muted)]" />
              <div className="text-[12px] font-medium text-white">Drop or click to upload</div>
              <div className="text-[11px] text-[var(--muted)]">PDF, DOCX, TXT, MD, TEX · Max 5 MB</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.tex"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
          <p className="mt-2.5 text-[11px] text-[var(--muted)] leading-relaxed">
            Your existing resume is parsed and used as reference to enrich bullet points. Nothing is stored.
          </p>
        </div>

        {/* AI toggle */}
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-[11px] border border-purple-500/30 bg-purple-500/10">
                <Sparkles className="size-4 text-purple-400" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-white">AI Optimization</div>
                <div className="text-[11px] text-[var(--muted)]">Rewrite bullets with AI context</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOptimizeWithAi((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition",
                optimizeWithAi
                  ? "border-purple-500/50 bg-purple-500/30"
                  : "border-white/[0.12] bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-white shadow transition-transform",
                  optimizeWithAi ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          {optimizeWithAi && (
            <p className="mt-3 text-[11px] text-purple-300/70 leading-relaxed">
              Requires an AI provider key in Settings. Falls back to deterministic generation if quota is exceeded.
            </p>
          )}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading}
          className={cn(
            "flex w-full items-center justify-center gap-2.5 rounded-[16px] border border-white/[0.14] bg-white px-5 py-3.5 text-[13px] font-semibold text-black shadow-[0_8px_32px_-12px_rgba(255,255,255,0.3)] transition hover:bg-white/90 hover:-translate-y-[1px] disabled:opacity-60 disabled:translate-y-0"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Zap className="size-4" />
              Generate Resume
            </>
          )}
        </button>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-2.5 rounded-[14px] border border-red-500/30 bg-red-500/[0.06] px-4 py-3"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-white">Generation Failed</div>
                <div className="mt-0.5 text-[11px] text-red-300/80">{error}</div>
              </div>
              <button type="button" onClick={() => setError(null)} className="ml-auto shrink-0 text-[var(--muted)] hover:text-white transition">
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right panel: Output ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {!result && !loading ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[520px] items-center justify-center rounded-[24px] border border-dashed border-white/[0.08] bg-white/[0.01]"
            >
              <div className="flex flex-col items-center gap-4 px-8 text-center">
                <div className="flex size-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-white/[0.03]">
                  <FileText className="size-7 text-[var(--muted)]" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-white">Your resume will appear here</div>
                  <div className="mt-1.5 max-w-xs text-[12px] text-[var(--muted)] leading-relaxed">
                    Fill in the role, optionally paste a job description and upload your existing resume, then click Generate.
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 w-full max-w-sm mt-1">
                  {[
                    { icon: "📄", label: "Clean PDF export" },
                    { icon: "📝", label: "LaTeX for Overleaf" },
                    { icon: "🤖", label: "AI-optimised bullets" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center"
                    >
                      <div className="text-lg">{item.icon}</div>
                      <div className="mt-1 text-[11px] font-medium text-[var(--muted)]">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[520px] items-center justify-center rounded-[24px] border border-white/[0.08] bg-white/[0.02]"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex size-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white/40" />
                  <Sparkles className="size-6 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-semibold text-white">Building your resume…</div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">
                    Pulling your logged work, projects & DSA from Career OS
                  </div>
                </div>
              </div>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col gap-4"
            >
              {/* Status bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border",
                    result.optimizedWithAi
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                      : "border-white/[0.10] bg-white/[0.04] text-white"
                  )}
                >
                  {result.optimizedWithAi ? (
                    <><Sparkles className="size-3" /> AI-Optimised</>
                  ) : (
                    <><Zap className="size-3" /> Deterministic</>
                  )}
                </span>

                {result.resume.matchedKeywords.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-[11px] font-medium text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    {result.resume.matchedKeywords.length} keywords matched
                  </span>
                )}

                {result.upload && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1 text-[11px] font-medium text-blue-300">
                    <Upload className="size-3" />
                    Existing resume merged
                  </span>
                )}

                {result.resume.template && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/[0.06] px-3 py-1 text-[11px] font-medium text-indigo-300">
                    <FileText className="size-3" />
                    Template: {result.resume.template}
                  </span>
                )}

                <span className="ml-auto text-[11px] text-[var(--muted)]">
                  {new Date(result.resume.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Download actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                >
                  {pdfLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadText(result.resume.markdown, result.downloads.markdownFileName)}
                  className="inline-flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-white/[0.08]"
                >
                  <Download className="size-3.5" />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadText(result.resume.latex, result.downloads.latexFileName, "text/x-tex")}
                  className="inline-flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-white/[0.08]"
                >
                  <Code2 className="size-3.5" />
                  LaTeX
                </button>
                <a
                  href="https://www.overleaf.com/latex/templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[12px] font-medium text-[var(--muted)] transition hover:text-white"
                >
                  <ExternalLink className="size-3.5" />
                  Open Overleaf
                </a>
              </div>

              {/* Tabs */}
              <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="flex border-b border-white/[0.06]">
                  {(["preview", "markdown", "latex"] as TabId[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-[12px] font-medium capitalize transition",
                        activeTab === tab
                          ? "border-b-2 border-white text-white"
                          : "text-[var(--muted)] hover:text-white"
                      )}
                    >
                      {tab === "markdown" ? "Markdown" : tab === "latex" ? "LaTeX" : "Preview"}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === "preview" && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-6 space-y-6"
                    >
                      {/* Header */}
                      <div className="border-b border-white/[0.06] pb-5">
                        <h1 className="text-[22px] font-bold text-white tracking-tight">
                          {result.resume.header.name}
                        </h1>
                        <p className="mt-1 text-[13px] text-[var(--muted)]">{result.resume.header.title}</p>
                        <p className="text-[12px] text-[var(--muted)]">{result.resume.header.email}</p>
                        {result.resume.header.education && (
                          <p className="text-[12px] text-[var(--muted)]">{result.resume.header.education}</p>
                        )}
                        {result.resume.header.links.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {result.resume.header.links.map((link) => (
                              <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white hover:bg-white/[0.08] transition"
                              >
                                <ExternalLink className="size-2.5" />
                                {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <ResumeSection title="Summary">
                        <ul className="space-y-1.5">
                          {result.resume.summaryBullets.map((b, i) => (
                            <li key={i} className="flex gap-2 text-[12px] text-[var(--muted)] leading-relaxed">
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-white/40" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </ResumeSection>

                      {/* Focus Areas */}
                      <ResumeSection title="Focus Areas">
                        <div className="flex flex-wrap gap-1.5">
                          {result.resume.focusAreas.map((area) => (
                            <span
                              key={area}
                              className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </ResumeSection>

                      {/* Technical Skills */}
                      {result.resume.skills && result.resume.skills.length > 0 && (
                        <ResumeSection title="Technical Skills">
                          <div className="space-y-3">
                            {result.resume.skills.map((skillGroup, i) => (
                              <div key={i} className="flex gap-2 text-[12px] leading-relaxed">
                                <span className="font-semibold text-white whitespace-nowrap">{skillGroup.label}:</span>
                                <span className="text-[var(--muted)]">{skillGroup.items.join(", ")}</span>
                              </div>
                            ))}
                          </div>
                        </ResumeSection>
                      )}

                      {/* Projects */}
                      {result.resume.projectHighlights.length > 0 && (
                        <ResumeSection title="Selected Projects">
                          <div className="space-y-4">
                            {result.resume.projectHighlights.map((proj, i) => (
                              <div key={i} className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
                                <div className="flex items-baseline justify-between gap-3">
                                  <div className="text-[13px] font-semibold text-white">{proj.title}</div>
                                  {proj.link && (
                                    <a
                                      href={proj.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 text-[11px] text-[var(--muted)] hover:text-white transition inline-flex items-center gap-1"
                                    >
                                      <ExternalLink className="size-2.5" /> Repo
                                    </a>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[11px] italic text-[var(--muted)]">{proj.subtitle}</p>
                                <ul className="mt-2 space-y-1">
                                  {proj.bullets.map((b, bi) => (
                                    <li key={bi} className="flex gap-2 text-[12px] text-[var(--muted)] leading-relaxed">
                                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-white/30" />
                                      {b}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </ResumeSection>
                      )}

                      {/* Problem Solving */}
                      {result.resume.problemSolvingHighlights.length > 0 && (
                        <ResumeSection title="Problem Solving">
                          <ul className="space-y-1.5">
                            {result.resume.problemSolvingHighlights.map((b, i) => (
                              <li key={i} className="flex gap-2 text-[12px] text-[var(--muted)] leading-relaxed">
                                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-white/30" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </ResumeSection>
                      )}

                      {/* Keywords */}
                      {result.resume.matchedKeywords.length > 0 && (
                        <div className="rounded-[14px] border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/70">
                            Matched Keywords
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {result.resume.matchedKeywords.map((kw) => (
                              <span
                                key={kw}
                                className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-0.5 text-[11px] text-emerald-300"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Editing Notes */}
                      {result.resume.editingNotes.length > 0 && (
                        <div className="mt-6 rounded-[16px] border border-amber-500/20 bg-amber-500/[0.04] p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <AlertTriangle className="size-4 text-amber-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-400/80">
                              Coaching Guidance (Not Exported)
                            </span>
                          </div>
                          <ul className="space-y-2">
                            {result.resume.editingNotes.map((note, i) => (
                              <li key={i} className="flex gap-2.5 text-[12px] text-amber-300/80 leading-relaxed">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500/40" />
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {(activeTab === "markdown" || activeTab === "latex") && (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(
                            activeTab === "markdown" ? result.resume.markdown : result.resume.latex
                          )
                        }
                        className="absolute right-4 top-3 z-10 inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.10]"
                      >
                        {copied ? (
                          <><CheckCircle2 className="size-3 text-emerald-400" /> Copied!</>
                        ) : (
                          "Copy"
                        )}
                      </button>
                      <pre className="max-h-[600px] overflow-auto p-6 custom-scrollbar text-[11.5px] leading-relaxed text-[var(--muted)] whitespace-pre-wrap font-mono">
                        {activeTab === "markdown" ? result.resume.markdown : result.resume.latex}
                      </pre>
                      {activeTab === "latex" && (
                        <div className="border-t border-white/[0.06] px-5 py-3">
                          <p className="text-[11px] text-[var(--muted)]">
                            Copy this LaTeX source and paste it into{" "}
                            <a
                              href="https://www.overleaf.com/latex/templates"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white underline underline-offset-2 hover:no-underline"
                            >
                              Overleaf
                            </a>{" "}
                            using the Jake&apos;s Resume template for best results.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Upload info card */}
              {result.upload && result.upload.warnings.length > 0 && (
                <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/[0.04] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-amber-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-400/80">
                      Upload Warnings
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {result.upload.warnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-amber-300/70">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResumeSection({
  title,
  children,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]",
          muted ? "text-amber-400/60" : "text-[var(--muted)]"
        )}
      >
        <span>{title}</span>
        <div className={cn("h-px flex-1", muted ? "bg-amber-500/10" : "bg-white/[0.05]")} />
      </div>
      {children}
    </div>
  );
}
