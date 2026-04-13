"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { RAGStatus } from "@/types/report";

interface KPITileProps {
  label: string;
  value: string;
  subtext?: string;
  rag: RAGStatus;
  trend: "up" | "down" | "flat" | null;
}

const ragValueStyles: Record<RAGStatus, string> = {
  RED: "text-rag-red border-rag-red",
  AMBER: "text-rag-amber border-rag-amber",
  GREEN: "text-rag-green border-rag-green",
};

function TrendIndicator({ trend }: { trend: KPITileProps["trend"] }) {
  if (trend === "up") {
    return <ArrowUpRight className="h-4 w-4 text-rag-green" />;
  }
  if (trend === "down") {
    return <ArrowDownRight className="h-4 w-4 text-rag-red" />;
  }
  if (trend === "flat") {
    return <Minus className="h-4 w-4 text-text-muted" />;
  }
  return null;
}

export function KPITile({ label, value, subtext, rag, trend }: KPITileProps) {
  return (
    <article className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-background-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`border-l-2 pl-2 text-2xl font-bold ${ragValueStyles[rag]}`}>{value}</p>
        <TrendIndicator trend={trend} />
      </div>
      {subtext ? <p className="text-xs text-text-secondary">{subtext}</p> : null}
    </article>
  );
}
