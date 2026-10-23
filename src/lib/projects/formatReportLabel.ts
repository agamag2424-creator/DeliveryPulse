import type { ProjectLatestReport } from "@/types/project";

export function formatLatestReportLabel(latestReport: ProjectLatestReport): string {
  const periodTo = new Date(latestReport.periodTo);
  const dateLabel = periodTo.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${latestReport.weekLabel} ${dateLabel}`;
}
