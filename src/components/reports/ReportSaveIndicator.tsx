"use client";

import { useEffect } from "react";

import { useReportSaveStatus } from "@/context/ReportSaveContext";

export function ReportSaveIndicator() {
  const { status, errorMessage, dismissError, reset } = useReportSaveStatus();

  useEffect(() => {
    if (status !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => {
      reset();
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [reset, status]);

  if (status === "idle") {
    return null;
  }

  if (status === "saving") {
    return (
      <div className="border-b border-border bg-background-card px-4 py-3 md:px-6">
        <div className="mx-auto w-full max-w-[1320px] text-sm text-text-muted">💾 Saving…</div>
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="border-b border-border bg-background-card px-4 py-3 md:px-6">
        <div className="mx-auto w-full max-w-[1320px] text-sm font-medium text-rag-green">✓ Saved</div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-rag-amber/10 px-4 py-3 md:px-6">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-3">
        <p className="text-sm font-medium text-rag-amber">
          ⚠️ Save failed — {errorMessage ?? "report not saved"}
        </p>
        <button
          type="button"
          onClick={dismissError}
          className="rounded-lg border border-border px-3 py-1 text-xs text-text-primary hover:bg-background-elevated"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
