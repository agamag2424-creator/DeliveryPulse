"use client";

import { useMemo, useState } from "react";

import { RAGBadge } from "@/components/slides/RAGBadge";
import { formatRagTrendLabel } from "@/lib/projects/ragTrend";
import type { RaidLogEntry } from "@/lib/projects/raidLog";
import type { RAGStatus } from "@/types/report";

type RaidFilter = "ALL" | "RISK" | "ISSUE" | "DEPENDENCY" | "ASSUMPTION";

interface ProjectRaidLogTabProps {
  entries: RaidLogEntry[];
}

export function ProjectRaidLogTab({ entries }: ProjectRaidLogTabProps) {
  const [filter, setFilter] = useState<RaidFilter>("ALL");

  const filtered = useMemo(() => {
    if (filter === "ALL") {
      return entries;
    }
    return entries.filter((entry) => entry.category === filter);
  }, [entries, filter]);

  const filters: { id: RaidFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "RISK", label: "Risks" },
    { id: "ISSUE", label: "Issues" },
    { id: "DEPENDENCY", label: "Dependencies" },
    { id: "ASSUMPTION", label: "Assumptions" },
  ];

  if (entries.length === 0) {
    return (
      <section className="rounded-panel border border-dashed border-border bg-background-card/50 px-6 py-10 text-center">
        <p className="text-sm text-text-secondary">No RAID items yet. Generate a report to populate this log.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === item.id
                ? "border-cyan bg-cyan/10 text-cyan-strong"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-panel border border-border bg-background-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-background-elevated text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">RAG</th>
              <th className="px-4 py-3">First Seen</th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3">Trend</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.key} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 text-text-secondary">{entry.category}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{entry.title}</td>
                <td className="px-4 py-3">
                  <RAGBadge status={entry.rag as RAGStatus} size="mini" />
                </td>
                <td className="px-4 py-3 text-text-muted">{new Date(entry.firstSeen).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-text-muted">{new Date(entry.lastSeen).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      entry.trend === "improved"
                        ? "text-rag-green"
                        : entry.trend === "degraded"
                          ? "text-rag-amber"
                          : "text-text-muted"
                    }
                  >
                    {formatRagTrendLabel(entry.trend)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
