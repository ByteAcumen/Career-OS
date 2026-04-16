"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, you'd send to an error monitoring service like Sentry
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-[22px] border border-red-500/20 bg-red-500/[0.06] p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="size-5 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Something went wrong</div>
            <div className="mt-1 text-xs text-zinc-500">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </div>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.09] hover:text-white"
          >
            <RotateCcw className="size-3" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
