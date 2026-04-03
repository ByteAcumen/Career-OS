"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Check, X } from "lucide-react";

/**
 * Lightweight password strength scorer — no external dependency.
 * Returns 0‑4 based on length, character diversity, and common patterns.
 */
function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  // cap at 4
  return Math.min(score, 4);
}

const rules = [
  { test: (pw: string) => pw.length >= 12, label: "At least 12 characters" },
  { test: (pw: string) => /[A-Z]/.test(pw), label: "One uppercase letter" },
  { test: (pw: string) => /[a-z]/.test(pw), label: "One lowercase letter" },
  { test: (pw: string) => /\d/.test(pw), label: "One number" },
  { test: (pw: string) => /[^a-zA-Z0-9]/.test(pw), label: "One special character" },
];

const strengthConfig = [
  { label: "Too weak", color: "#ef4444", glow: "rgba(239,68,68,0.25)" },
  { label: "Weak", color: "#f97316", glow: "rgba(249,115,22,0.25)" },
  { label: "Fair", color: "#eab308", glow: "rgba(234,179,8,0.25)" },
  { label: "Good", color: "#22c55e", glow: "rgba(34,197,94,0.25)" },
  { label: "Strong", color: "#14b8a6", glow: "rgba(20,184,166,0.35)" },
];

export function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => scorePassword(password), [password]);
  const config = strengthConfig[score];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 space-y-3"
      aria-live="polite"
    >
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Password strength</span>
          <motion.span
            key={config.label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: config.color }}
            className="font-semibold"
          >
            {config.label}
          </motion.span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: 1,
                backgroundColor: i <= score - 1 ? config.color : "rgba(255,255,255,0.08)",
              }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              style={{
                originX: 0,
                boxShadow: i <= score - 1 ? `0 0 8px ${config.glow}` : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Rules checklist */}
      <div className="grid gap-1">
        {rules.map((rule) => {
          const passed = rule.test(password);
          return (
            <motion.div
              key={rule.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs"
            >
              {passed ? (
                <Check className="size-3 text-teal-400" />
              ) : (
                <X className="size-3 text-slate-500" />
              )}
              <span className={passed ? "text-slate-300" : "text-slate-500"}>
                {rule.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
