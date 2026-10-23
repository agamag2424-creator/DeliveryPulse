import type { Report } from "@prisma/client";

import type { ReportOutput } from "@/lib/reportOutputSchema";
import type { Milestone, ReportInput } from "@/types/report";

export interface EmbedChunk {
  content: string;
  chunkType: string;
  metadata: Record<string, unknown>;
}

const MAX_WORDS = 500;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function parseReportInput(report: Report): ReportInput | null {
  if (!report.inputSnapshot || typeof report.inputSnapshot !== "object") {
    return null;
  }
  return report.inputSnapshot as unknown as ReportInput;
}

function hasMilestoneVariance(milestone: Milestone): boolean {
  return milestone.status === "Delayed" || milestone.baselineDate !== milestone.forecastDate;
}

function buildBaseMetadata(report: Report, chunkType: string): Record<string, unknown> {
  return {
    reportId: report.id,
    projectId: report.projectId,
    userId: report.userId ?? "system",
    weekLabel: report.weekLabel,
    periodFrom: report.periodFrom.toISOString(),
    ragStatus: report.ragStatus,
    chunkType,
  };
}

function addChunk(
  chunks: EmbedChunk[],
  report: Report,
  chunkType: string,
  content: string,
  extraMetadata: Record<string, unknown> = {},
): void {
  const trimmed = content.trim();
  if (!trimmed) {
    return;
  }

  chunks.push({
    content: trimmed,
    chunkType,
    metadata: {
      ...buildBaseMetadata(report, chunkType),
      ...extraMetadata,
    },
  });
}

export function chunkReport(report: Report, output: ReportOutput): EmbedChunk[] {
  const chunks: EmbedChunk[] = [];

  addChunk(chunks, report, "executive_summary", output.executive_summary);

  output.highlights_wins.forEach((win, index) => {
    addChunk(chunks, report, "highlight_win", win, { index });
  });

  output.highlights_concerns.forEach((concern, index) => {
    addChunk(chunks, report, "highlight_concern", concern, { index });
  });

  output.raid_attention_items.forEach((item, index) => {
    addChunk(
      chunks,
      report,
      "raid_attention",
      [`Category: ${item.category}`, `Title: ${item.title}`, `Threatens: ${item.threatens}`, `Action required: ${item.action_required}`].join("\n"),
      { index, category: item.category, rag: item.rag },
    );
  });

  const input = parseReportInput(report);
  input?.milestones
    .filter(hasMilestoneVariance)
    .forEach((milestone, index) => {
      addChunk(
        chunks,
        report,
        "milestone_variance",
        [
          `Milestone: ${milestone.milestoneName}`,
          `Status: ${milestone.status}`,
          `Baseline: ${milestone.baselineDate}`,
          `Forecast: ${milestone.forecastDate}`,
          milestone.owner ? `Owner: ${milestone.owner}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        { index, milestoneName: milestone.milestoneName },
      );
    });

  addChunk(chunks, report, "commercial_narrative", output.financial_narrative);

  output.workstream_analysis
    .filter((workstream) => workstream.blocker_count > 0 || workstream.blocker_details.length > 0)
    .forEach((workstream, index) => {
      const blockerLines = workstream.blocker_details.map(
        (blocker) =>
          `- ${blocker.description} (${blocker.type}, ${blocker.days_open} days open, owner: ${blocker.owner}). Impact: ${blocker.impact}`,
      );

      addChunk(
        chunks,
        report,
        "workstream_blockers",
        [
          `Workstream: ${workstream.workstream_name}`,
          `Overall RAG: ${workstream.overall_rag}`,
          `Blocker count: ${workstream.blocker_count}`,
          ...blockerLines,
        ].join("\n"),
        { index, workstreamName: workstream.workstream_name },
      );
    });

  for (const chunk of chunks) {
    if (countWords(chunk.content) > MAX_WORDS) {
      throw new Error(`Chunk "${chunk.chunkType}" exceeds ${MAX_WORDS} words.`);
    }
  }

  return chunks;
}

export function validateEmbedChunks(chunks: EmbedChunk[]): void {
  for (const chunk of chunks) {
    const required = ["reportId", "projectId", "userId", "weekLabel", "periodFrom", "ragStatus", "chunkType"] as const;
    for (const field of required) {
      if (chunk.metadata[field] === undefined || chunk.metadata[field] === null || chunk.metadata[field] === "") {
        throw new Error(`Chunk metadata missing required field: ${field}`);
      }
    }

    if (countWords(chunk.content) > MAX_WORDS) {
      throw new Error(`Chunk "${chunk.chunkType}" exceeds ${MAX_WORDS} words.`);
    }
  }
}
