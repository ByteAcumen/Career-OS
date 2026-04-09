"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  LockKeyhole,
  Target,
  CheckCircle2,
  Zap,
  BookOpen,
  TrendingUp,
} from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "Clear daily direction",
    body: "Home stays narrow and useful: next task, weekly momentum, and recent proof of work.",
  },
  {
    icon: BookOpen,
    title: "Planning without clutter",
    body: "Planner owns task lanes, schedule blocks, review, and the focus timer; no mixing forms.",
  },
  {
    icon: BrainCircuit,
    title: "AI grounded in your data",
    body: "Suggestions are based on goals, targets, logs, and patterns already stored in your workspace.",
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    body: "Sessions, settings, AI keys, and user data stay isolated per account with server-side protection.",
  },
];

const STATS = [
  { label: "Pages", value: "6", detail: "Home / Planner / Logger / Progress / Strategy / Settings" },
  { label: "AI role", value: "Supportive", detail: "Direction and review; not overwhelming the interface." },
  { label: "Privacy", value: "User-scoped", detail: "Each account keeps its own data, sessions, and keys." },
];

const NAV_ITEMS = ["Home", "Planner", "Logger", "Progress", "Strategy", "Settings"];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--paper)] text-white">
      {/* Ambient gradient */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-white/[0.015] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="page-topbar sticky top-0 z-30">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-[14px] border border-white/[0.10] bg-white/[0.06]">
              <Target className="size-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none text-white">Career OS</div>
              <div className="mt-0.5 text-[10px] leading-none text-[var(--muted)]">Private workspace</div>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/sign-in"
              className="hidden rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="landing-cta-primary"
            >
              Get started
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-8 lg:py-28">
        {/* Left: copy */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col"
        >
          <div className="page-pill w-fit">Focused interview preparation</div>

          <h1 className="mt-6 text-5xl font-semibold leading-[1.06] tracking-[-0.055em] text-white sm:text-6xl lg:text-[68px]">
            A cleaner way to run your&nbsp;interview prep.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-[1.85] text-[var(--muted)]">
            Plan the week, log real proof of work, review momentum, and use AI that reads your actual data instead of generic prompts.
          </p>

          <ul className="mt-7 flex flex-col gap-2.5">
            {["Private per-account workspace", "AI grounded in your real activity", "Focus timer + progress tracking"].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-[var(--muted)]">
                <CheckCircle2 className="size-4 shrink-0 text-white/60" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className="landing-cta-primary text-base px-6 py-3.5">
              Start free workspace
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/sign-in" className="landing-cta-secondary text-base px-6 py-3.5">
              Sign in
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                className="metric-panel"
              >
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{s.label}</div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-white">{s.value}</div>
                <div className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">{s.detail}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: dashboard preview */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
          className="glass-card relative overflow-hidden rounded-[28px] p-5"
        >
          {/* Inner card */}
          <div className="rounded-[22px] border border-white/[0.07] bg-black/40 p-5">
            {/* Card header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Dashboard preview
                </div>
                <div className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                  Calm, structured, and readable.
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--line)] bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/80">
                Secure
              </span>
            </div>

            {/* Card body */}
            <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr]">
              {/* Nav column */}
              <div className="rounded-[18px] border border-[var(--line)] bg-white/[0.025] p-3.5">
                <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Navigation
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {NAV_ITEMS.map((item, i) => (
                    <div
                      key={item}
                      className={`rounded-[12px] px-3 py-2.5 text-sm transition-colors ${
                        i === 0
                          ? "bg-white font-medium text-black"
                          : "text-[var(--muted)] hover:bg-white/[0.05]"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content column */}
              <div className="flex flex-col gap-3.5">
                <div className="rounded-[18px] border border-[var(--line)] bg-white/[0.025] p-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Home</div>
                  <div className="mt-2 text-lg font-semibold leading-snug tracking-tight text-white">
                    Keep the next task obvious and&nbsp;finishable.
                  </div>
                  <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                    <PreviewTile label="Current streak" value="12" />
                    <PreviewTile label="Open tasks" value="5" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <PreviewFeature icon={BrainCircuit} label="AI strategy" />
                  <PreviewFeature icon={Activity} label="Progress" />
                  <PreviewFeature icon={LockKeyhole} label="Private" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.35 }}
            className="mb-10 text-center"
          >
            <div className="page-pill mb-4 mx-auto w-fit">What&apos;s inside</div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Everything you need, nothing you don&apos;t.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-[1.9] text-[var(--muted)]">
              Career OS is opinionated by design. Each section has one job.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="landing-feature-card group"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.05] transition-colors group-hover:border-white/[0.14] group-hover:bg-white/[0.08]">
                  <item.icon className="size-4 text-white/80" />
                </div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-2.5 text-[13px] leading-[1.85] text-[var(--muted)]">{item.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer band */}
      <section className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 text-center sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
          >
            <TrendingUp className="mx-auto mb-5 size-8 text-white/40" />
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Ready to start tracking progress?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-[1.9] text-[var(--muted)]">
              Free to use. No subscription. Your data stays yours.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/sign-up" className="landing-cta-primary text-base px-7 py-3.5">
                Create free workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/sign-in" className="landing-cta-secondary text-base px-7 py-3.5">
                Already have one? Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-4 py-8 text-center text-[11px] text-[var(--muted)] sm:px-6">
        <div className="mx-auto max-w-[1280px] flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <span>(c) 2025 Career OS / Private student workspace</span>
          <div className="flex gap-4">
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PreviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--line)] bg-white/[0.03] px-3.5 py-3">
      <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}

function PreviewFeature({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-[var(--line)] bg-white/[0.025] p-3 text-center">
      <div className="flex size-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.05]">
        <Icon className="size-3.5 text-white/80" />
      </div>
      <div className="text-[10px] font-medium leading-tight text-[var(--muted)]">{label}</div>
    </div>
  );
}


