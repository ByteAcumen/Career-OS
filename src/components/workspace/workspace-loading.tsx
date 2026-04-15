import { cn } from "@/lib/utils";

export type WorkspaceLoadingPage =
  | "home"
  | "planner"
  | "logger"
  | "progress"
  | "strategy"
  | "settings";

const pageCopy: Record<WorkspaceLoadingPage, { title: string; description: string }> = {
  home: {
    title: "Home",
    description: "Loading your next step, weekly momentum, and recent work.",
  },
  planner: {
    title: "Planner",
    description: "Loading your task lanes, schedule blocks, and review tools.",
  },
  logger: {
    title: "Logger",
    description: "Loading your work capture forms and recent entries.",
  },
  progress: {
    title: "Progress",
    description: "Loading streaks, charts, and historical detail.",
  },
  strategy: {
    title: "Strategy",
    description: "Loading AI guidance, patterns, and next moves.",
  },
  settings: {
    title: "Settings",
    description: "Loading profile, planning defaults, integrations, and security.",
  },
};

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("skeleton-block rounded-full", className)} />;
}

function SkeletonPanel({
  className,
  titleWidth = "w-28",
  lines = ["w-full", "w-4/5"],
}: {
  className?: string;
  titleWidth?: string;
  lines?: string[];
}) {
  return (
    <div className={cn("glass-card rounded-[28px] p-5 sm:p-6", className)}>
      <div className="space-y-3">
        <SkeletonLine className={cn("h-3", titleWidth)} />
        <div className="space-y-2">
          {lines.map((line, index) => (
            <SkeletonLine key={`${line}-${index}`} className={cn("h-4", line)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-4">
        <SkeletonLine className="h-7 w-24" />
        <SkeletonLine className="h-12 w-full max-w-[42rem]" />
        <SkeletonLine className="h-4 w-full max-w-[34rem]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonPanel key={index} className="min-h-[154px]" lines={["w-2/3", "w-4/5"]} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_0.95fr]">
        <div className="grid gap-6">
          <SkeletonPanel
            className="min-h-[360px]"
            titleWidth="w-36"
            lines={["w-full", "w-11/12", "w-3/4", "w-10/12"]}
          />
          <SkeletonPanel
            className="min-h-[280px]"
            titleWidth="w-32"
            lines={["w-full", "w-full", "w-5/6"]}
          />
        </div>
        <div className="grid gap-6">
          <SkeletonPanel className="min-h-[220px]" titleWidth="w-28" lines={["w-full", "w-4/5", "w-11/12"]} />
          <SkeletonPanel className="min-h-[200px]" titleWidth="w-24" lines={["w-full", "w-3/4"]} />
          <SkeletonPanel
            className="min-h-[240px]"
            titleWidth="w-[6.5rem]"
            lines={["w-full", "w-full", "w-2/3"]}
          />
        </div>
      </div>
    </div>
  );
}

function PlannerSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-4">
        <SkeletonLine className="h-7 w-28" />
        <SkeletonLine className="h-11 w-full max-w-[36rem]" />
        <SkeletonLine className="h-4 w-full max-w-[30rem]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonPanel key={index} className="min-h-[150px]" lines={["w-3/4", "w-5/6"]} />
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_0.82fr]">
        <SkeletonPanel
          className="min-h-[560px]"
          titleWidth="w-44"
          lines={["w-full", "w-full", "w-full", "w-11/12", "w-10/12"]}
        />
        <div className="grid gap-6">
          <SkeletonPanel className="min-h-[250px]" titleWidth="w-32" lines={["w-full", "w-4/5", "w-3/4"]} />
          <SkeletonPanel
            className="min-h-[320px]"
            titleWidth="w-[8.5rem]"
            lines={["w-full", "w-full", "w-5/6", "w-4/5"]}
          />
          <SkeletonPanel className="min-h-[180px]" titleWidth="w-28" lines={["w-full", "w-4/5"]} />
        </div>
      </div>

      <SkeletonPanel
        className="min-h-[320px]"
        titleWidth="w-32"
        lines={["w-full", "w-full", "w-full", "w-5/6"]}
      />
    </div>
  );
}

function LoggerSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-4">
        <SkeletonLine className="h-7 w-24" />
        <SkeletonLine className="h-11 w-full max-w-[34rem]" />
        <SkeletonLine className="h-4 w-full max-w-[28rem]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SkeletonPanel className="min-h-[300px]" titleWidth="w-24" lines={["w-full", "w-full", "w-4/5"]} />
        <SkeletonPanel className="min-h-[300px]" titleWidth="w-24" lines={["w-full", "w-11/12", "w-3/4"]} />
        <SkeletonPanel className="min-h-[300px]" titleWidth="w-32" lines={["w-full", "w-full", "w-5/6"]} />
      </div>

      <SkeletonPanel
        className="min-h-[280px]"
        titleWidth="w-40"
        lines={["w-full", "w-full", "w-full", "w-4/5"]}
      />
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-4">
        <SkeletonLine className="h-7 w-[7.5rem]" />
        <SkeletonLine className="h-11 w-full max-w-[36rem]" />
        <SkeletonLine className="h-4 w-full max-w-[28rem]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonPanel key={index} className="min-h-[148px]" lines={["w-3/4", "w-2/3"]} />
        ))}
      </div>

      <SkeletonPanel
        className="min-h-[360px]"
        titleWidth="w-44"
        lines={["w-full", "w-full", "w-3/4"]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonPanel className="min-h-[260px]" titleWidth="w-28" lines={["w-full", "w-5/6", "w-3/4"]} />
        <SkeletonPanel className="min-h-[260px]" titleWidth="w-36" lines={["w-full", "w-full", "w-4/5"]} />
      </div>
    </div>
  );
}

function StrategySkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-4">
        <SkeletonLine className="h-7 w-32" />
        <SkeletonLine className="h-11 w-full max-w-[38rem]" />
        <SkeletonLine className="h-4 w-full max-w-[30rem]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.95fr]">
        <SkeletonPanel
          className="min-h-[360px]"
          titleWidth="w-44"
          lines={["w-full", "w-full", "w-11/12", "w-3/4"]}
        />
        <div className="grid gap-6">
          <SkeletonPanel className="min-h-[180px]" titleWidth="w-28" lines={["w-full", "w-4/5"]} />
          <SkeletonPanel className="min-h-[180px]" titleWidth="w-32" lines={["w-full", "w-5/6"]} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonPanel className="min-h-[220px]" titleWidth="w-32" lines={["w-full", "w-full", "w-2/3"]} />
        <SkeletonPanel
          className="min-h-[220px]"
          titleWidth="w-[7.5rem]"
          lines={["w-full", "w-4/5", "w-10/12"]}
        />
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="space-y-4">
        <SkeletonLine className="h-7 w-[7.5rem]" />
        <SkeletonLine className="h-11 w-full max-w-[36rem]" />
        <SkeletonLine className="h-4 w-full max-w-[32rem]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
        <div className="grid gap-6">
          <SkeletonPanel className="min-h-[240px]" titleWidth="w-40" lines={["w-full", "w-full", "w-10/12"]} />
          <SkeletonPanel className="min-h-[260px]" titleWidth="w-32" lines={["w-full", "w-5/6", "w-full"]} />
          <SkeletonPanel className="min-h-[240px]" titleWidth="w-36" lines={["w-full", "w-full", "w-4/5"]} />
        </div>
        <div className="grid gap-6">
          <SkeletonPanel className="min-h-[220px]" titleWidth="w-28" lines={["w-full", "w-4/5"]} />
          <SkeletonPanel
            className="min-h-[240px]"
            titleWidth="w-[8.5rem]"
            lines={["w-full", "w-full", "w-3/4"]}
          />
        </div>
      </div>
    </div>
  );
}

function PageSkeleton({ page }: { page: WorkspaceLoadingPage }) {
  switch (page) {
    case "planner":
      return <PlannerSkeleton />;
    case "logger":
      return <LoggerSkeleton />;
    case "progress":
      return <ProgressSkeleton />;
    case "strategy":
      return <StrategySkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    case "home":
    default:
      return <HomeSkeleton />;
  }
}

export function WorkspaceRouteLoading({ page }: { page: WorkspaceLoadingPage }) {
  return (
    <div className="app-shell min-h-screen text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-white/[0.08] bg-[rgba(6,6,6,0.92)] px-3 py-4 backdrop-blur lg:flex lg:flex-col">
        <div className="flex items-center gap-3 rounded-[18px] px-2 py-2">
          <div className="skeleton-block size-10 rounded-[16px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-3 w-32" />
          </div>
        </div>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto px-1">
          {["Workspace", "Account"].map((group, groupIndex) => (
            <div key={group} className="space-y-2">
              <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {group}
              </div>
              <div className="space-y-1">
                {Array.from({ length: groupIndex === 0 ? 5 : 1 }).map((_, itemIndex) => (
                  <div
                    key={`${group}-${itemIndex}`}
                    className={cn(
                      "flex items-center gap-3 rounded-[18px] px-3 py-3",
                      groupIndex === 0 && itemIndex === 0 ? "bg-white text-black" : "bg-white/[0.02]",
                    )}
                  >
                    <div
                      className={cn(
                        "size-4 rounded-full",
                        groupIndex === 0 && itemIndex === 0 ? "bg-black/20" : "bg-white/[0.18]",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <SkeletonLine
                        className={cn(
                          "h-3",
                          groupIndex === 0 && itemIndex === 0 ? "bg-black/20" : "bg-white/10",
                          itemIndex % 2 === 0 ? "w-20" : "w-24",
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-white/[0.08] px-2 pt-4">
          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="skeleton-block size-10 rounded-[16px]" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-4 w-24" />
                <SkeletonLine className="h-3 w-36" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[280px]">
        <header className="page-topbar">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {pageCopy[page].title}
              </div>
              <div className="truncate text-sm text-white">{pageCopy[page].description}</div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <SkeletonLine className="h-8 w-36" />
              <SkeletonLine className="h-10 w-28" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <PageSkeleton page={page} />
        </main>
      </div>
    </div>
  );
}
