"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isSignup = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError("");

    try {
      if (isSignup) {
        const result = await authClient.signUp.email({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });

        if (result.error) {
          throw new Error(result.error.message || "Sign up failed.");
        }
      } else {
        const result = await authClient.signIn.email({
          email: form.email.trim(),
          password: form.password,
        });

        if (result.error) {
          throw new Error(result.error.message || "Sign in failed.");
        }
      }

      router.push("/home");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Authentication failed.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_30%),linear-gradient(180deg,_#06111a_0%,_#020617_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.24em] text-teal-200 backdrop-blur-xl">
            <Sparkles className="size-3.5" />
            Career OS Secure Edition
          </div>
          <div className="max-w-2xl space-y-5">
            <h1 className="heading-font text-5xl leading-[0.92] text-transparent sm:text-6xl">
              Secure daily execution for serious engineering careers.
            </h1>
            <p className="max-w-xl text-base leading-8 text-slate-300">
              Private accounts, server-side sessions, isolated user data, AI tools,
              and a focused dashboard that feels like a real product instead of a
              spreadsheet replacement.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Protected sessions",
                body: "HTTP-only cookies and authenticated API access.",
              },
              {
                icon: LockKeyhole,
                title: "Owned data",
                body: "Each account gets isolated snapshots, builds, and applications.",
              },
              {
                icon: Workflow,
                title: "Built to grow",
                body: "Structured service layer, auth routes, and migration-ready storage.",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * (index + 1) }}
                  className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl"
                >
                  <Icon className="size-5 text-teal-300" />
                  <div className="mt-4 text-sm font-semibold">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{item.body}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-card rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
        >
          <div className="mb-6 space-y-2">
            <div className="text-sm uppercase tracking-[0.22em] text-slate-400">
              {isSignup ? "Create account" : "Welcome back"}
            </div>
            <h2 className="text-3xl font-semibold text-white">
              {isSignup ? "Start your private workspace." : "Sign in to your dashboard."}
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignup ? (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Full name</span>
                <input
                  required
                  className="field !min-h-[52px] bg-slate-950/70"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Aarav Sharma"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Email</span>
              <input
                required
                type="email"
                className="field !min-h-[52px] bg-slate-950/70"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Password</span>
              <input
                required
                type="password"
                minLength={12}
                className="field !min-h-[52px] bg-slate-950/70"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="At least 12 characters"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full rounded-full px-4 py-3 text-sm font-semibold transition",
                isPending
                  ? "cursor-not-allowed bg-slate-500 text-slate-200"
                  : "bg-[linear-gradient(135deg,#2dd4bf_0%,#fbbf24_100%)] text-slate-950 hover:brightness-105",
              )}
            >
              {isPending
                ? "Securing session..."
                : isSignup
                  ? "Create secure account"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-300">
            {isSignup ? "Already have an account?" : "Need an account?"}{" "}
            <Link
              href={isSignup ? "/sign-in" : "/sign-up"}
              className="font-semibold text-teal-300 transition hover:text-white"
            >
              {isSignup ? "Sign in" : "Create one"}
            </Link>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
