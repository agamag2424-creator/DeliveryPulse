import type { RAGStatus } from "@/types/report";

export type RagTrend = "improved" | "degraded" | "stable";

const RAG_RANK: Record<RAGStatus, number> = {
  GREEN: 0,
  AMBER: 1,
  RED: 2,
};

export function getRagTrend(current: RAGStatus, previous: RAGStatus | null): RagTrend {
  if (!previous) {
    return "stable";
  }

  const delta = RAG_RANK[current] - RAG_RANK[previous];
  if (delta < 0) {
    return "improved";
  }
  if (delta > 0) {
    return "degraded";
  }
  return "stable";
}

export function formatRagTrendLabel(trend: RagTrend): string {
  if (trend === "improved") {
    return "↑ Improved";
  }
  if (trend === "degraded") {
    return "↓ Degraded";
  }
  return "— Stable";
}
