"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";

async function authJson<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? ("message" in payload && payload.message) || ("error" in payload && payload.error)
        : null;
    throw new Error(message || "Verification failed.");
  }

  return payload as T;
}

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      if (mode === "totp") {
        await authJson("/api/auth/two-factor/verify-totp", {
          code: code.trim(),
          trustDevice,
        });
      } else {
        await authJson("/api/auth/two-factor/verify-backup-code", {
          code: code.trim(),
        });
      }

      router.replace("/home");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not verify your two-factor code.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-4 py-10 text-[var(--ink)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1080px] items-center justify-center">
        <div className="grid w-full max-w-[960px] gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden rounded-[32px] border border-[var(--line)] bg-white/[0.03] p-8 lg:block">
            <div className="page-pill w-fit">
              <ShieldCheck className="size-3.5" />
              Secure access
            </div>
            <h1 className="mt-6 max-w-[360px] text-4xl font-semibold tracking-[-0.05em] text-white">
              Confirm it&apos;s really you.
            </h1>
            <p className="mt-4 max-w-[420px] text-sm leading-8 text-[var(--muted-strong)]">
              Two-factor authentication adds a second proof of identity after your password.
              Use your authenticator app or a recovery code to continue.
            </p>
            <div className="mt-8 grid gap-3">
              <InfoCard
                title="Authenticator first"
                text="A rotating 6-digit code is the safest option for daily sign-in."
              />
              <InfoCard
                title="Backup code recovery"
                text="Use a backup code only when your authenticator device is unavailable."
              />
              <InfoCard
                title="Trusted devices"
                text="Only trust private devices you control."
              />
            </div>
          </section>

          <section className="auth-card mx-auto w-full max-w-[460px] overflow-hidden">
            <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Two-factor check
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Verify sign-in
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Enter the code from your authenticator app or a backup code to unlock your workspace.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 rounded-[18px] border border-[var(--line)] bg-white/[0.02] p-1">
                <button
                  type="button"
                  onClick={() => setMode("totp")}
                  className={`rounded-[14px] px-3 py-2.5 text-sm font-medium transition ${
                    mode === "totp" ? "bg-white text-black" : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Authenticator
                </button>
                <button
                  type="button"
                  onClick={() => setMode("backup")}
                  className={`rounded-[14px] px-3 py-2.5 text-sm font-medium transition ${
                    mode === "backup" ? "bg-white text-black" : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Backup code
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="auth-label">
                    <KeyRound className="size-3.5" />
                    {mode === "totp" ? "Authenticator code" : "Backup code"}
                  </span>
                  <input
                    type="text"
                    inputMode={mode === "totp" ? "numeric" : "text"}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={mode === "totp" ? "6-digit code" : "Recovery code"}
                    className="auth-field"
                    autoComplete="one-time-code"
                    required
                  />
                </label>

                {mode === "totp" ? (
                  <label className="flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--muted-strong)]">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(event) => setTrustDevice(event.target.checked)}
                      className="size-4 rounded border-white/20 bg-transparent"
                    />
                    Trust this device for future sign-ins
                  </label>
                ) : null}

                {error ? <div className="auth-error">{error}</div> : null}

                <button type="submit" disabled={pending} className="auth-btn-primary">
                  {pending ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle className="size-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Continue
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[var(--muted)]">
                Need to return?{" "}
                <Link href="/sign-in" className="font-medium text-white hover:text-[var(--muted-strong)]">
                  Back to sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/[0.03] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-[var(--muted)]">{text}</div>
    </div>
  );
}
