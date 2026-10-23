import type { RagTrend } from "@/lib/projects/ragTrend";

export type ProjectReportListItem = {
  id: string;
  weekLabel: string;
  ragStatus: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  ragTrend: RagTrend;
};
