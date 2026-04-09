function LoadingBar({ className }: { className: string }) {
  return <div className={`skeleton-block rounded-full ${className}`} />;
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <div className="skeleton-block size-11 rounded-[18px]" />
            <div className="space-y-2">
              <LoadingBar className="h-4 w-28" />
              <LoadingBar className="h-3 w-40" />
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <LoadingBar className="h-10 w-28" />
            <LoadingBar className="h-10 w-32" />
          </div>
        </header>

        <main className="flex-1 py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_0.9fr]">
            <section className="glass-card rounded-[32px] p-7 sm:p-8">
              <div className="space-y-4">
                <LoadingBar className="h-8 w-44" />
                <LoadingBar className="h-16 w-full max-w-[36rem]" />
                <LoadingBar className="h-16 w-full max-w-[32rem]" />
                <LoadingBar className="h-4 w-full max-w-[28rem]" />
                <LoadingBar className="h-4 w-full max-w-[24rem]" />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <LoadingBar className="h-12 w-40" />
                <LoadingBar className="h-12 w-36" />
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
                    <LoadingBar className="h-3 w-24" />
                    <LoadingBar className="mt-4 h-4 w-full" />
                    <LoadingBar className="mt-2 h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-[32px] p-7 sm:p-8">
              <div className="space-y-4">
                <LoadingBar className="h-5 w-36" />
                <LoadingBar className="h-[26rem] w-full rounded-[28px]" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
