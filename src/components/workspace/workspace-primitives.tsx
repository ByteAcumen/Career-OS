"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export const sectionStagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        <div className="page-pill">{eyebrow}</div>
        <h1 className="mt-4 max-w-[14ch] text-[2.2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.8rem] sm:leading-[1.02] lg:text-[3.25rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-[0.95rem]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      variants={riseIn}
      className={cn("glass-card section-panel rounded-[28px] p-5 sm:p-6", className)}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </motion.section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="metric-panel min-h-[152px]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-4 text-[2rem] font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</div>
    </div>
  );
}

export function InfoCard({
  label,
  value,
  muted = false,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("soft-card", className)}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </div>
      <div className={cn("mt-3 text-sm leading-7", muted ? "text-[var(--muted)]" : "text-white")}>
        {value}
      </div>
    </div>
  );
}

export function ProgressMeter({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="soft-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {current}/{target} this week
          </div>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1 text-xs font-semibold text-white">
          {progress}%
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/8">
        <div className="h-2 rounded-full bg-white" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/[0.02] px-4 py-5">
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{description}</div>
    </div>
  );
}

export function ActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/6 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
    >
      {label}
      <ArrowUpRight className="size-3.5 text-[var(--muted)]" />
    </Link>
  );
}
