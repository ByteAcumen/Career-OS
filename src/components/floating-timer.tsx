"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, Coffee, Pause, Play, RefreshCw, X } from "lucide-react";

import type { WorkspaceSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

function playAlertSound() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const Context =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) {
      return;
    }

    const audioContext = new Context();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, audioContext.currentTime + 0.8);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
  } catch {
    // Ignore audio failures so the timer still works.
  }
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FloatingTimer({
  settings,
  setToast,
}: {
  settings: WorkspaceSettings;
  setToast: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(settings.timerFocusMinutes * 60);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });

  const targetSeconds = useMemo(
    () => (mode === "focus" ? settings.timerFocusMinutes * 60 : settings.timerBreakMinutes * 60),
    [mode, settings.timerBreakMinutes, settings.timerFocusMinutes],
  );

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          playAlertSound();

          const message =
            mode === "focus"
              ? "Focus session complete. Take a short reset."
              : "Break complete. Return to the next task.";

          setToast(message);

          if (notificationPermission === "granted" && typeof Notification !== "undefined") {
            new Notification("Career OS Timer", { body: message });
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [mode, notificationPermission, running, setToast]);

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setToast("Browser notifications are not supported here.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      setToast("Timer notifications enabled.");
    }
  }

  const progress = targetSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / targetSeconds) * 100)) : 0;

  return (
    <>
      <AnimatePresence>
        {!open ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-[65] inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-[rgba(10,10,10,0.94)] px-3 py-2 text-sm font-medium text-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.95)] backdrop-blur sm:bottom-6 sm:right-6"
          >
            <div className="flex size-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/6">
              {mode === "focus" ? <AlarmClock className="size-4 text-white" /> : <Coffee className="size-4 text-white" />}
            </div>
            <span className="font-mono tracking-[0.08em]">{formatTimer(secondsLeft)}</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            className="fixed bottom-5 right-5 z-[65] w-[min(92vw,340px)] rounded-[28px] border border-white/[0.08] bg-[rgba(10,10,10,0.96)] p-5 shadow-[0_30px_80px_-36px_rgba(0,0,0,0.98)] backdrop-blur sm:bottom-6 sm:right-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-[var(--line)] bg-white/6 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode("focus");
                    setRunning(false);
                    setSecondsLeft(settings.timerFocusMinutes * 60);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition",
                    mode === "focus" ? "bg-white text-black" : "text-[var(--muted)] hover:text-white",
                  )}
                >
                  Focus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("break");
                    setRunning(false);
                    setSecondsLeft(settings.timerBreakMinutes * 60);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition",
                    mode === "break" ? "bg-white text-black" : "text-[var(--muted)] hover:text-white",
                  )}
                >
                  Break
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--line)] bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-8 grid place-items-center">
              <div className="relative flex h-[190px] w-[190px] items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={339.292}
                    strokeDashoffset={339.292 - (339.292 * progress) / 100}
                  />
                </svg>
                <div className="text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {mode}
                  </div>
                  <div className="mt-3 font-mono text-5xl font-semibold tracking-tight text-white">
                    {formatTimer(secondsLeft)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={() => {
                  if (secondsLeft === 0) {
                    setSecondsLeft(targetSeconds);
                  }
                  setRunning((value) => !value);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                {running ? "Pause session" : "Start session"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setSecondsLeft(targetSeconds);
                }}
                className="inline-flex items-center justify-center rounded-[18px] border border-[var(--line)] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>

            {notificationPermission !== "granted" ? (
              <button
                type="button"
                onClick={() => void enableNotifications()}
                className="mt-3 w-full rounded-[18px] border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-white/[0.06] hover:text-white"
              >
                Enable timer notifications
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
