"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ClipboardEdit,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
  WandSparkles,
  X,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import type { WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const CareerAssistant = dynamic(
  () => import("@/components/career-assistant").then((module) => module.CareerAssistant),
  { ssr: false },
);

export type WorkspacePageId =
  | "home"
  | "planner"
  | "logger"
  | "progress"
  | "strategy"
  | "settings";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { id: "home" as const, label: "Home", href: "/home", icon: LayoutDashboard },
      { id: "planner" as const, label: "Planner", href: "/planner", icon: Target },
      { id: "logger" as const, label: "Logger", href: "/logger", icon: ClipboardEdit },
      { id: "progress" as const, label: "Progress", href: "/progress", icon: Activity },
      { id: "strategy" as const, label: "Strategy", href: "/strategy", icon: WandSparkles },
    ],
  },
  {
    label: "Account",
    items: [{ id: "settings" as const, label: "Settings", href: "/settings", icon: Settings }],
  },
] as const;

const pageCopy: Record<WorkspacePageId, { title: string; description: string }> = {
  home: {
    title: "Home",
    description: "See the next step, your weekly momentum, and only the context that matters right now.",
  },
  planner: {
    title: "Planner",
    description: "Organize the week, manage task lanes, and keep your execution rhythm tight.",
  },
  logger: {
    title: "Logger",
    description: "Capture DSA work, builds, and applications without mixing logging into planning.",
  },
  progress: {
    title: "Progress",
    description: "Review streaks, analytics, history, and proof of work without planner noise.",
  },
  strategy: {
    title: "Strategy",
    description: "Use AI as a focused strategist for your next moves, weak spots, and weekly direction.",
  },
  settings: {
    title: "Settings",
    description: "Manage goals, links, integrations, AI keys, and account security in one place.",
  },
};

type WorkspaceUiValue = {
  setToast: (message: string) => void;
};

const WorkspaceUiContext = createContext<WorkspaceUiValue | null>(null);

export function useWorkspaceUi() {
  const context = useContext(WorkspaceUiContext);

  if (!context) {
    throw new Error("useWorkspaceUi must be used inside WorkspaceShell.");
  }

  return context;
}

export function WorkspaceShell({
  page,
  currentUser,
  children,
}: {
  page: WorkspacePageId;
  currentUser: WorkspaceUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const uiValue = useMemo(() => ({ setToast }), []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await authClient.signOut();
    } finally {
      router.replace("/sign-in");
      router.refresh();
    }
  }

  function renderNav(compact: boolean) {
    return navGroups.map((group) => (
      <div key={group.label} className="space-y-2">
        {!compact ? (
          <div className="px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {group.label}
          </div>
        ) : null}
        <div className="space-y-1">
          {group.items.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[16px] border px-3 py-2.5 text-[13px] font-medium transition",
                  active
                    ? "border-white/[0.16] bg-white/[0.08] text-white shadow-[0_22px_42px_-30px_rgba(255,255,255,0.28)]"
                    : "border-transparent text-[var(--muted)] hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white",
                  compact && "justify-center px-0 py-0 size-[48px]",
                )}
                aria-current={active ? "page" : undefined}
                title={compact ? item.label : undefined}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[13px] border transition",
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/[0.08] bg-white/[0.04] text-white group-hover:border-white/[0.12] group-hover:bg-white/[0.08]",
                    compact && "size-9 border-transparent bg-transparent",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active ? "text-black" : "text-white")} />
                </span>
                {!compact ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      </div>
    ));
  }

  return (
    <WorkspaceUiContext.Provider value={uiValue}>
      <div className="app-shell min-h-screen text-white">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.08] bg-[rgba(6,6,6,0.92)] px-3 py-4 backdrop-blur lg:flex lg:flex-col",
            collapsed ? "w-[84px]" : "w-[256px]",
          )}
        >
          <div className="flex items-start justify-between gap-3 px-2">
            <Link href="/home" className="flex min-w-0 items-center gap-3 rounded-[16px] px-2 py-1.5">
              <div className="flex size-10 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.04]">
                <Target className="size-4 text-white" />
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white">Career OS</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">Focused student workspace</div>
                </div>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden rounded-[14px] border border-[var(--line)] bg-white/[0.04] p-2 text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-white lg:inline-flex"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </div>

          <div className="mt-5 flex-1 space-y-5 overflow-y-auto px-1 custom-scrollbar">
            {renderNav(collapsed)}
          </div>

          <div className="mt-4 border-t border-white/[0.08] px-2 pt-4">
            <div
              className={cn(
                "rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-2.5",
                collapsed && "flex flex-col items-center gap-3 px-2",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.05] text-[13px] font-semibold text-white">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </div>
                {!collapsed ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Signed in
                      </div>
                      <div className="truncate text-[13px] font-medium text-white">{currentUser.name}</div>
                      <div className="truncate text-[11px] text-[var(--muted)]">{currentUser.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      disabled={signingOut}
                      className="rounded-[14px] border border-[var(--line)] bg-white/[0.04] px-2.5 py-2 text-[11px] font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {signingOut ? "..." : "Sign out"}
                    </button>
                  </>
                ) : null}
              </div>

              {collapsed ? (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="inline-flex size-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-white/[0.04] text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <AnimatePresence>
          {mobileOpen ? (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(90vw,320px)] flex-col border-r border-white/[0.08] bg-[rgba(6,6,6,0.98)] px-4 py-4 lg:hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href="/home" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                    <div className="flex size-11 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04]">
                      <Target className="size-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Career OS</div>
                      <div className="text-xs text-[var(--muted)]">Focused student workspace</div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[14px] border border-[var(--line)] bg-white/[0.04] p-2 text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-6 flex-1 space-y-6 overflow-y-auto custom-scrollbar">{renderNav(false)}</div>
                <div className="mb-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Signed in
                  </div>
                  <div className="mt-2 text-sm font-medium text-white">{currentUser.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">{currentUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[var(--line)] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                >
                  <LogOut className="size-4" />
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[84px]" : "lg:pl-[256px]")}>
          <header className="page-topbar">
            <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex rounded-[14px] border border-[var(--line)] bg-white/[0.04] p-2 text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-white lg:hidden"
                >
                  <Menu className="size-4" />
                </button>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    {pageCopy[page].title}
                  </div>
                  <div className="mt-1 max-w-3xl truncate text-sm font-medium text-white sm:text-[15px]">
                    {pageCopy[page].description}
                  </div>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white">
                  {currentUser.name}
                </div>
                <div className="rounded-full border border-[var(--line)] bg-white/6 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                  Protected workspace
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="rounded-full border border-[var(--line)] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1360px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
            {children}
          </main>
        </div>

        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed bottom-6 left-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 rounded-full border border-[var(--line)] bg-[rgba(18,18,18,0.94)] px-4 py-3 text-center text-sm text-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.95)] backdrop-blur"
            >
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <CareerAssistant userId={currentUser.id} />
      </div>
    </WorkspaceUiContext.Provider>
  );
}
