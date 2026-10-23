import type { ReportOutput } from "@/lib/reportOutputSchema";

export type RaidLogEntry = {
  key: string;
  category: string;
  title: string;
  rag: string;
  firstSeen: string;
  lastSeen: string;
  trend: "improved" | "degraded" | "stable";
  reportCount: number;
};

type ReportSnapshot = {
  id: string;
  generatedAt: Date;
  periodFrom: Date;
  outputSnapshot: unknown;
};

const RAG_RANK: Record<string, number> = { GREEN: 0, AMBER: 1, RED: 2 };

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function buildRaidKey(category: string, title: string): string {
  return `${category}:${normalizeTitle(title)}`;
}

function getRaidTrend(firstRag: string, lastRag: string): RaidLogEntry["trend"] {
  const first = RAG_RANK[firstRag] ?? 1;
  const last = RAG_RANK[lastRag] ?? 1;
  if (last < first) {
    return "improved";
  }
  if (last > first) {
    return "degraded";
  }
  return "stable";
}

export function buildRaidLog(reports: ReportSnapshot[]): RaidLogEntry[] {
  const grouped = new Map<
    string,
    {
      category: string;
      title: string;
      firstSeen: string;
      lastSeen: string;
      firstRag: string;
      lastRag: string;
      reportCount: number;
    }
  >();

  const chronological = [...reports].sort(
    (a, b) => a.generatedAt.getTime() - b.generatedAt.getTime(),
  );

  for (const report of chronological) {
    const output = report.outputSnapshot as ReportOutput;
    if (!output?.raid_attention_items?.length) {
      continue;
    }

    for (const item of output.raid_attention_items) {
      const key = buildRaidKey(item.category, item.title);
      const seenAt = report.periodFrom.toISOString();
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          category: item.category,
          title: item.title,
          firstSeen: seenAt,
          lastSeen: seenAt,
          firstRag: item.rag,
          lastRag: item.rag,
          reportCount: 1,
        });
        continue;
      }

      existing.lastSeen = seenAt;
      existing.lastRag = item.rag;
      existing.reportCount += 1;
    }
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      category: value.category,
      title: value.title,
      rag: value.lastRag,
      firstSeen: value.firstSeen,
      lastSeen: value.lastSeen,
      trend: getRaidTrend(value.firstRag, value.lastRag),
      reportCount: value.reportCount,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}
