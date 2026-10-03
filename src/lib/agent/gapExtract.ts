import { getLlmClient } from "@/lib/ai/llm";
import type { UsageActor } from "@/lib/usage/constants";
import { recordUsageEvent } from "@/lib/usage/record";
import type { Milestone, ReportInput } from "@/types/report";

import { createEmptyReportInput } from "./emptyReportInput";
import type { Gap } from "./types";

function parseBudgetBurn(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*%/);
  if (match) {
    const value = Number(match[1]);
    return value >= 0 && value <= 100 ? value : null;
  }
  const bare = text.match(/\b(\d{1,3})\b/);
  if (bare) {
    const value = Number(bare[1]);
    return value >= 0 && value <= 100 ? value : null;
  }
  return null;
}

async function extractWithLlm(
  gaps: Gap[],
  pmAnswers: Record<string, string>,
  actor?: UsageActor,
): Promise<Record<string, string>> {
  const llm = getLlmClient();
  if (!llm.isConfigured()) {
    return pmAnswers;
  }

  const prompt = `Extract structured values from PM answers for a project report gap-fill form.
Return ONLY valid JSON object mapping field paths to extracted string values.
Fields needed: ${gaps.map((g) => g.field).join(", ")}

PM answers:
${JSON.stringify(pmAnswers, null, 2)}

Rules:
- healthData.currentBudgetBurnPercent: extract integer 0-100 from natural language
- freeTextDump: use full PM narrative text
- milestones: if PM describes dates, return JSON array string of milestone objects
- projectData.deliveryPMName: extract name if mentioned`;

  try {
    const response = await llm.complete({
      user: prompt,
      maxTokens: 1000,
      temperature: 0,
    });

    if (actor) {
      await recordUsageEvent({
        organizationId: actor.organizationId,
        userId: actor.userId,
        kind: "GAP_EXTRACT",
        status: "SUCCESS",
        provider: llm.provider,
        model: llm.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      });
    }

    const text = response.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      return JSON.parse(text) as Record<string, string>;
    } catch {
      return pmAnswers;
    }
  } catch (error) {
    if (actor) {
      await recordUsageEvent({
        organizationId: actor.organizationId,
        userId: actor.userId,
        kind: "GAP_EXTRACT",
        status: "FAILURE",
        provider: llm.provider,
        model: llm.model,
        error: error instanceof Error ? error.message : "Gap extract failed",
      });
    }
    return pmAnswers;
  }
}

function applyFieldUpdate(input: ReportInput, field: string, value: string): void {
  switch (field) {
    case "healthData.currentBudgetBurnPercent": {
      const parsed = parseBudgetBurn(value);
      if (parsed !== null) {
        input.healthData.currentBudgetBurnPercent = parsed;
      }
      break;
    }
    case "healthData.currentScopeCompletionPercent": {
      const parsed = parseBudgetBurn(value);
      if (parsed !== null) {
        input.healthData.currentScopeCompletionPercent = parsed;
      }
      break;
    }
    case "healthData.currentScheduleHealthPercent": {
      const parsed = parseBudgetBurn(value);
      if (parsed !== null) {
        input.healthData.currentScheduleHealthPercent = parsed;
      }
      break;
    }
    case "freeTextDump":
      input.freeTextDump = value.trim();
      break;
    case "projectData.deliveryPMName":
      input.projectData.deliveryPMName = value.trim();
      break;
    case "projectData.reportingPeriodFrom":
      input.projectData.reportingPeriodFrom = value.trim();
      break;
    case "projectData.reportingPeriodTo":
      input.projectData.reportingPeriodTo = value.trim();
      break;
    case "milestones":
      try {
        const parsed = JSON.parse(value) as Milestone[];
        if (Array.isArray(parsed) && parsed.length >= 3) {
          input.milestones = parsed;
        }
      } catch {
        // keep existing milestones
      }
      break;
    default:
      break;
  }
}

export async function applyGapAnswers(
  partialInput: Partial<ReportInput>,
  gaps: Gap[],
  pmAnswers: Record<string, string>,
  actor?: UsageActor,
): Promise<ReportInput> {
  const empty = createEmptyReportInput();
  const input: ReportInput = {
    ...empty,
    ...(partialInput as ReportInput),
    projectData: { ...empty.projectData, ...(partialInput.projectData ?? {}) },
    healthData: { ...empty.healthData, ...(partialInput.healthData ?? {}) },
    healthHistory: partialInput.healthHistory ?? empty.healthHistory,
    milestones: partialInput.milestones ?? empty.milestones,
    workstreams: partialInput.workstreams ?? empty.workstreams,
    raid: { ...empty.raid, ...(partialInput.raid ?? {}) },
    commercialData: { ...empty.commercialData, ...(partialInput.commercialData ?? {}) },
    decisions: partialInput.decisions ?? empty.decisions,
    freeTextDump: partialInput.freeTextDump ?? "",
  };

  const extracted = await extractWithLlm(gaps, pmAnswers, actor);

  for (const gap of gaps) {
    const answer = extracted[gap.field] ?? pmAnswers[gap.field] ?? pmAnswers[gap.label] ?? "";
    if (answer) {
      applyFieldUpdate(input, gap.field, answer);
    }
  }

  // Allow a single free-text answer to satisfy freeTextDump when keyed generically
  if (!input.freeTextDump.trim() && pmAnswers.context) {
    input.freeTextDump = pmAnswers.context.trim();
  }
  if (!input.freeTextDump.trim() && pmAnswers.notes) {
    input.freeTextDump = pmAnswers.notes.trim();
  }

  return input;
}

export function mergePartialToReportInput(partial: Partial<ReportInput>): ReportInput {
  const empty = createEmptyReportInput();
  return {
    ...empty,
    ...(partial as ReportInput),
    projectData: { ...empty.projectData, ...(partial.projectData ?? {}) },
    healthData: { ...empty.healthData, ...(partial.healthData ?? {}) },
    healthHistory: partial.healthHistory ?? empty.healthHistory,
    milestones: partial.milestones ?? empty.milestones,
    workstreams: partial.workstreams ?? empty.workstreams,
    raid: { ...empty.raid, ...(partial.raid ?? {}) },
    commercialData: { ...empty.commercialData, ...(partial.commercialData ?? {}) },
    decisions: partial.decisions ?? empty.decisions,
    freeTextDump: partial.freeTextDump ?? "",
  };
}
