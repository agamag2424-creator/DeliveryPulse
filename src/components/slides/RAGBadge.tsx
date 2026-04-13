"use client";

import type { RAGStatus } from "@/types/report";

interface RAGBadgeProps {
  status: RAGStatus;
  reason?: string;
  size: "large" | "small" | "mini";
  isManualOverride?: boolean;
}

const statusStyles: Record<RAGStatus, { bg: string; border: string; text: string }> = {
  RED: {
    bg: "bg-rag-red/15",
    border: "border-rag-red",
    text: "text-rag-red",
  },
  AMBER: {
    bg: "bg-rag-amber/15",
    border: "border-rag-amber",
    text: "text-rag-amber",
  },
  GREEN: {
    bg: "bg-rag-green/15",
    border: "border-rag-green",
    text: "text-rag-green",
  },
};

const sizeStyles: Record<RAGBadgeProps["size"], string> = {
  large: "px-6 py-4 text-2xl",
  small: "px-4 py-2 text-sm",
  mini: "px-3 py-1 text-xs",
};

export function RAGBadge({ status, reason, size, isManualOverride = false }: RAGBadgeProps) {
  const styles = statusStyles[status];
  const badgeSize = sizeStyles[size];

  return (
    <div className="inline-flex max-w-full flex-col gap-2">
      <span
        className={`inline-flex w-fit items-center rounded-full border font-semibold tracking-wide ${styles.bg} ${styles.border} ${styles.text} ${badgeSize}`}
      >
        {status}
      </span>
      {reason ? (
        <p className="max-w-[340px] truncate text-xs text-text-secondary" title={reason}>
          {reason}
        </p>
      ) : null}
      {isManualOverride ? (
        <span className="w-fit rounded-full border border-border bg-background-elevated px-2 py-1 text-[10px] font-medium text-text-muted">
          Manually set
        </span>
      ) : null}
    </div>
  );
}
