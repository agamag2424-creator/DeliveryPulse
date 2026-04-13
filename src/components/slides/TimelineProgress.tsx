"use client";

import type { RAGStatus } from "@/types/report";

interface TimelineProgressProps {
  elapsedPercent: number;
  scopePercent: number;
  elapsedDays: number;
  totalDays: number;
  rag: RAGStatus;
}

const ragFillStyles: Record<RAGStatus, string> = {
  RED: "bg-rag-red",
  AMBER: "bg-rag-amber",
  GREEN: "bg-rag-green",
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function TimelineProgress({
  elapsedPercent,
  scopePercent,
  elapsedDays,
  totalDays,
  rag,
}: TimelineProgressProps) {
  const safeElapsedPercent = clampPercent(elapsedPercent);
  const safeScopePercent = clampPercent(scopePercent);

  return (
    <section className="rounded-xl border border-border bg-background-card p-4">
      <div className="space-y-2">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">Timeline Elapsed</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-elevated">
            <div
              className="h-full bg-rag-grey transition-all"
              style={{ width: `${safeElapsedPercent}%` }}
            />
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">Scope Delivered</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-elevated">
            <div
              className={`h-full transition-all ${ragFillStyles[rag]}`}
              style={{ width: `${safeScopePercent}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-secondary">
        {elapsedDays}d elapsed of {totalDays} total / {safeScopePercent}% delivered
      </p>
    </section>
  );
}
