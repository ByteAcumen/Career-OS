"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
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
  BarChart3,
  Sparkles,
  Shield,
  Timer,
  ChevronRight,
  Star,
} from "lucide-react";

/* ─── Animation Variants ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

/* ─── Data ───────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Zap,
    title: "Clear daily direction",
    body: "Home stays narrow and useful: next task, weekly momentum, and recent proof of work — nothing else.",
    accent: "from-yellow-500/15 to-orange-500/5",
    iconBg: "border-yellow-500/20 bg-yellow-500/10",
    iconColor: "text-yellow-400",
    large: false,
  },
  {
    icon: BrainCircuit,
    title: "AI grounded in your data",
    body: "Suggestions based on your real goals, logs, and patterns — not generic prompts.",
    accent: "from-violet-500/15 to-purple-500/5",
    iconBg: "border-violet-500/20 bg-violet-500/10",
    iconColor: "text-violet-400",
    large: true,
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    body: "Sessions, settings, and AI keys stay isolated per account with server-side AES-256 encryption.",
    accent: "from-emerald-500/15 to-teal-500/5",
    iconBg: "border-emerald-500/20 bg-emerald-500/10",
    iconColor: "text-emerald-400",
    large: false,
  },
  {
    icon: BookOpen,
    title: "Planning without clutter",
    body: "Planner owns task lanes, schedule blocks and the focus timer — no mixing of concerns.",
    accent: "from-sky-500/15 to-blue-500/5",
    iconBg: "border-sky-500/20 bg-sky-500/10",
    iconColor: "text-sky-400",
    large: false,
  },
  {
    icon: BarChart3,
    title: "Real progress tracking",
    body: "DSA, builds, and applications tracked with weekly velocity charts and streak data.",
    accent: "from-pink-500/15 to-rose-500/5",
    iconBg: "border-pink-500/20 bg-pink-500/10",
    iconColor: "text-pink-400",
    large: false,
  },
  {
    icon: Timer,
    title: "Built-in focus timer",
    body: "Pomodoro timer integrated directly into the sidebar — start deep work in one click.",
    accent: "from-cyan-500/15 to-indigo-500/5",
    iconBg: "border-cyan-500/20 bg-cyan-500/10",
    iconColor: "text-cyan-400",
    large: false,
  },
];

const STATS = [
  { label: "Sections", value: "6", sub: "each with one job" },
  { label: "AI models", value: "3+", sub: "providers, auto-fallback" },
  { label: "Encryption", value: "AES‑256", sub: "for stored API keys" },
];

const NAV_ITEMS = ["Home", "Planner", "Logger", "Progress", "Strategy", "Settings"];

const ROTATING_WORDS = [
  "interview prep",
  "DSA practice",
  "job search",
  "skill building",
  "career growth",
];

/* ─── Typewriter word rotator ────────────────────────────────── */
function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex overflow-hidden" style={{ minWidth: "1ch" }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ duration: 0.38, ease: "easeInOut" }}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─── Ambient orb ────────────────────────────────────────────── */
function GradientOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-[120px] ${className}`}
      animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 8 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/* ─── Magnetic CTA wrapper ───────────────────────────────────── */
function MagneticWrap({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 26 });
  const sy = useSpring(y, { stiffness: 280, damping: 26 });

  function onMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }}>
      <motion.div style={{ x: sx, y: sy }}>{children}</motion.div>
    </div>
  );
}

/* ─── Bento feature card ─────────────────────────────────────── */
function FeatureCard({ feature, large }: { feature: (typeof FEATURES)[number]; large?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const gradient = useTransform(
    [mx, my],
    ([px, py]) =>
      `radial-gradient(200px circle at ${px}px ${py}px, rgba(255,255,255,0.04), transparent 70%)`,
  );

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      className={`bento-card group relative overflow-hidden ${large ? "sm:col-span-2" : ""}`}
    >
      <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ background: gradient }} />
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
      <div className="relative z-20 flex h-full flex-col gap-4 p-6">
        <div className={`flex size-10 items-center justify-center rounded-[12px] border ${feature.iconBg} transition-colors duration-300`}>
          <feature.icon className={`size-4.5 ${feature.iconColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
          <p className="mt-2 text-[13px] leading-[1.8] text-[var(--muted)]">{feature.body}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Dashboard preview ──────────────────────────────────────── */
function DashboardPreview() {
  const [activeNav, setActiveNav] = useState(0);
  const previewContent = [
    {
      label: "HOME",
      title: "Today's priorities",
      tiles: [
        { name: "DSA solved", val: "3", unit: "today", trend: "+2 vs yesterday", up: true },
        { name: "Current streak", val: "12", unit: "days", trend: "Personal best", up: true },
        { name: "Open tasks", val: "5", unit: "pending", trend: "3 due today", up: false },
        { name: "Apps sent", val: "8", unit: "this week", trend: "On target", up: true },
      ],
    },
    {
      label: "PROGRESS",
      title: "Weekly velocity",
      tiles: [
        { name: "DSA target", val: "80%", unit: "complete", trend: "8/10 problems", up: true },
        { name: "Builds", val: "3", unit: "logged", trend: "4 target", up: false },
        { name: "Applications", val: "5", unit: "sent", trend: "On target", up: true },
        { name: "Focus time", val: "18h", unit: "this week", trend: "+3h vs last", up: true },
      ],
    },
  ];
  const current = previewContent[activeNav % previewContent.length];

  return (
    <motion.div
      variants={scaleIn}
      className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#050505]/80 backdrop-blur-3xl shadow-[0_0_120px_-24px_rgba(139,92,246,0.15)] ring-1 ring-white/[0.05]"
    >
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-violet-500/[0.10] blur-[60px]" />

      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
        <div className="size-2.5 rounded-full bg-[#ff5f56]" />
        <div className="size-2.5 rounded-full bg-[#febc2e]" />
        <div className="size-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1">
          <div className="size-1.5 rounded-full bg-emerald-400/60" />
          <span className="text-[10px] text-white/40">career-os.app/home</span>
        </div>
      </div>

      <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr]">
        {/* Sidebar */}
        <div className="border-r border-white/[0.05] bg-[#080808]">
          <div className="p-3">
            <div className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="flex size-5 items-center justify-center rounded-[6px] border border-white/[0.10] bg-white/[0.06]">
                <Target className="size-2.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-white/70">Career OS</span>
            </div>
            <div className="mb-1 px-2 text-[8px] font-bold uppercase tracking-[0.16em] text-white/25">Workspace</div>
            {NAV_ITEMS.slice(0, 5).map((item, i) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveNav(i < 2 ? i : 0)}
                className={`mb-0.5 w-full rounded-[8px] px-2 py-1.5 text-left text-[10px] transition-all ${
                  i === activeNav % previewContent.length
                    ? "bg-white font-semibold text-black"
                    : "text-white/45 hover:bg-white/[0.05] hover:text-white/70"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="p-4">
          <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">{current.label}</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-3 text-[15px] font-semibold tracking-tight text-white">{current.title}</div>
              <div className="grid grid-cols-2 gap-2">
                {current.tiles.map((tile, i) => (
                  <motion.div
                    key={tile.name}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-[10px] border border-white/[0.06] bg-white/[0.025] p-2.5"
                  >
                    <div className="text-[8px] uppercase tracking-[0.14em] text-white/35">{tile.name}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[17px] font-semibold leading-none text-white">{tile.val}</span>
                      <span className="text-[9px] text-white/30">{tile.unit}</span>
                    </div>
                    <div className={`mt-1.5 text-[8px] font-medium ${tile.up ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                      {tile.trend}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main landing page ──────────────────────────────────────── */
export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--paper)] text-white">

      {/* ── Background ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 55%)",
          }}
        />
        <GradientOrb className="top-[-180px] left-1/2 h-[640px] w-[640px] -translate-x-1/2 bg-violet-600/[0.16]" delay={0} />
        <GradientOrb className="top-[25%] right-[-120px] h-[480px] w-[480px] bg-cyan-500/[0.10]" delay={3} />
        <GradientOrb className="top-[65%] left-[-80px] h-[360px] w-[360px] bg-pink-500/[0.08]" delay={5} />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[rgba(5,5,5,0.85)] backdrop-blur-[18px]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.07]">
              <Target className="size-3.5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none text-white">Career OS</div>
              <div className="mt-0.5 text-[10px] leading-none text-white/35">Private workspace</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden rounded-full border border-white/[0.09] px-4 py-2 text-sm font-medium text-white/50 transition-all hover:border-white/[0.18] hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <MagneticWrap>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-all hover:bg-neutral-100 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]"
              >
                Get started
                <ArrowRight className="size-3.5" />
              </Link>
            </MagneticWrap>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-[1280px] px-4 pt-16 pb-20 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ── Left column: Copy ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col">

            {/* Badge */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
                <Sparkles className="size-3" />
                Focused interview prep
              </span>
            </motion.div>

            {/* Headline — fixed sizing so rotation never overflows */}
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[clamp(2.8rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-white/95"
            >
              A cleaner way to run your{" "}
              <span className="inline-flex items-baseline">
                <RotatingWord />
              </span>
            </motion.h1>

            {/* Sub-copy */}
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-[480px] text-[15px] leading-[1.85] text-white/55"
            >
              Plan the week, log real proof of work, review momentum, and use AI that reads your actual data — not generic prompts.
            </motion.p>

            {/* Feature bullets */}
            <motion.ul variants={stagger} className="mt-6 flex flex-col gap-2">
              {[
                "Private per-account workspace with AES-256 encryption",
                "AI grounded in your real activity, goals, and logs",
                "Focus timer, progress tracking & streaks built in",
              ].map((item) => (
                <motion.li key={item} variants={fadeUp} className="flex items-start gap-2.5 text-sm text-white/50">
                  <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                    <CheckCircle2 className="size-2.5 text-emerald-400" />
                  </div>
                  {item}
                </motion.li>
              ))}
            </motion.ul>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-black shadow-[0_0_32px_rgba(255,255,255,0.15)] transition-all hover:bg-neutral-100 hover:shadow-[0_0_48px_rgba(255,255,255,0.25)] hover:scale-105"
              >
                Start free workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-6 py-3 text-[15px] font-medium text-white/70 transition-all hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white hover:-translate-y-0.5"
              >
                Sign in
              </Link>
            </motion.div>

            {/* Stats pills */}
            <motion.div variants={stagger} className="mt-8 flex flex-wrap gap-2.5">
              {STATS.map((s) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/30">{s.label}</div>
                    <div className="mt-0.5 text-base font-semibold text-white">{s.value}</div>
                    <div className="text-[10px] text-white/35">{s.sub}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Right column: Dashboard preview ── */}
          <motion.div initial="hidden" animate="show" variants={scaleIn} transition={{ delay: 0.15 }}>
            <DashboardPreview />
          </motion.div>
        </div>
      </section>

      {/* ── Features bento ── */}
      <section className="relative z-10 border-t border-white/[0.05]">
        <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="mb-12 text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
              <Star className="size-3" />
              What&apos;s inside
            </span>
            <h2 className="mt-5 text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-tight text-white">
              Everything you need.{" "}
              <span className="text-white/40">Nothing you don&apos;t.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.85] text-white/45">
              Career OS is opinionated by design. Each section has one job and executes it cleanly.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="bento-grid"
          >
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} large={feature.large} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trust band ── */}
      <section className="relative z-10 border-t border-white/[0.05]">
        <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Shield, title: "AES-256 Encrypted", body: "API keys stored with military-grade encryption — never in plaintext.", color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/8" },
              { icon: LockKeyhole, title: "User-Scoped Sessions", body: "Every account's data, keys, and settings are fully isolated.", color: "text-violet-400", bg: "border-violet-500/20 bg-violet-500/8" },
              { icon: Activity, title: "Zero Tracking", body: "No analytics, no usage data sold. Your workspace stays yours.", color: "text-sky-400", bg: "border-sky-500/20 bg-sky-500/8" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-3.5 rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border ${item.bg}`}>
                  <item.icon className={`size-4 ${item.color}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-white/45">{item.body}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 border-t border-white/[0.05]">
        <div className="relative mx-auto max-w-[1280px] overflow-hidden px-4 py-28 text-center sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.15] blur-[120px]" />
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}>
              <TrendingUp className="mx-auto mb-5 size-8 text-white/20" />
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-[clamp(1.9rem,5vw,3rem)] font-semibold tracking-[-0.04em] text-white">
              Ready to level up?
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-sm text-[14px] leading-[1.9] text-white/45">
              Free to use. No subscription. Your data stays yours — always.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-black shadow-[0_0_36px_rgba(255,255,255,0.18)] transition-all hover:bg-neutral-100 hover:shadow-[0_0_48px_rgba(255,255,255,0.28)] hover:-translate-y-0.5"
              >
                Create free workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-7 py-3.5 text-[15px] font-medium text-white/60 transition-all hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white hover:-translate-y-0.5"
              >
                Sign in
                <ChevronRight className="size-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] px-4 py-7 sm:px-6">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-[7px] border border-white/[0.10] bg-white/[0.05]">
              <Target className="size-3 text-white/60" />
            </div>
            <span className="text-[11px] text-white/30">© 2025 Career OS · Private student workspace</span>
          </div>
          <div className="flex gap-5 text-[11px] text-white/30">
            <Link href="/sign-in" className="transition-colors hover:text-white">Sign in</Link>
            <Link href="/sign-up" className="transition-colors hover:text-white">Create account</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
