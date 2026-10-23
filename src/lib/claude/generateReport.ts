import { getLlmClient } from "@/lib/ai/llm";
import type { TokenUsage } from "@/lib/ai/types";
import { buildReportUserPrompt, REPORT_SYSTEM_PROMPT } from "@/lib/claudeReportPrompt";
import { reportOutputSchema, type ReportOutput } from "@/lib/reportOutputSchema";
import type { UsageActor } from "@/lib/usage/constants";
import { recordUsageEvent } from "@/lib/usage/record";
import type { EngagementModel, ReportInput } from "@/types/report";

/** Full ReportOutput JSON routinely exceeds 4k tokens; truncation caused false "rag_status" failures. */
const REPORT_MAX_OUTPUT_TOKENS = 16_000;

function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0 };
}

function addUsage(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
  };
}

async function recordGenerateUsage(
  actor: UsageActor | undefined,
  status: "SUCCESS" | "FAILURE",
  tokens: TokenUsage,
  provider: string,
  model: string,
  error?: string,
): Promise<void> {
  if (!actor) {
    return;
  }
  await recordUsageEvent({
    organizationId: actor.organizationId,
    userId: actor.userId,
    kind: "REPORT_GENERATE",
    status,
    provider,
    model,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    error,
  });
}

function normalizeEngagementModel(value: unknown, fallback: EngagementModel): EngagementModel {
  if (value === "TNM" || value === "FP") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (["TM", "TAM", "TNM", "TIMEANDMATERIALS", "TIMEANDMATERIAL"].includes(cleaned)) {
    return "TNM";
  }
  if (["FP", "FIXEDPRICE", "FIXED"].includes(cleaned) || cleaned.startsWith("FIXED")) {
    return "FP";
  }
  return fallback;
}

function normalizeRagValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned === "RED" || cleaned === "GREEN" || cleaned === "GREY" || cleaned === "GRAY") {
    return cleaned === "GRAY" ? "GREY" : cleaned;
  }
  if (cleaned === "AMBER" || cleaned === "YELLOW" || cleaned === "ORANGE") {
    return "AMBER";
  }
  return value;
}

const RAG_VALUE_KEYS = new Set([
  "rag_status",
  "rag_ai_suggested",
  "forecast_rag",
  "overall_rag",
  "velocity_rag",
  "capacity_rag",
  "dependency_rag",
  "consumed_rag",
  "variance_rag",
  "rag",
]);

function normalizeRagFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeRagFields);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    if (RAG_VALUE_KEYS.has(key)) {
      next[key] = normalizeRagValue(child);
    } else {
      next[key] = normalizeRagFields(child);
    }
  }
  return next;
}

export function validateRequiredReportInput(reportInput: ReportInput): string | null {
  if (!reportInput.projectData.projectName.trim()) return "projectData.projectName";
  if (!reportInput.projectData.clientName.trim()) return "projectData.clientName";
  if (!reportInput.projectData.reportingPeriodFrom) return "projectData.reportingPeriodFrom";
  if (!reportInput.projectData.reportingPeriodTo) return "projectData.reportingPeriodTo";
  if (!reportInput.projectData.deliveryPMName.trim()) return "projectData.deliveryPMName";
  if (reportInput.healthHistory.length < 2) return "healthHistory";
  if (reportInput.milestones.length < 3) return "milestones";
  if (reportInput.freeTextDump.trim().length < 50) return "freeTextDump";
  return null;
}

function extractJsonObject(rawText: string): string {
  let raw = rawText.trim();
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  raw = raw.replace(/\s*```$/i, "").trim();
  if (raw.startsWith("{") && raw.endsWith("}")) {
    return raw;
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

function parseAndValidate(rawText: string, input?: ReportInput) {
  const raw = extractJsonObject(rawText);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const fallbackEngagementModel = input?.commercialData.engagementModel ?? "TNM";
  const withRag = normalizeRagFields(parsed) as Record<string, unknown>;
  const financialKpis =
    withRag.financial_kpis && typeof withRag.financial_kpis === "object"
      ? (withRag.financial_kpis as Record<string, unknown>)
      : null;

  const normalized = {
    ...withRag,
    highlights_wins: Array.isArray(withRag.highlights_wins) ? withRag.highlights_wins.slice(0, 4) : [],
    highlights_concerns: Array.isArray(withRag.highlights_concerns)
      ? withRag.highlights_concerns.slice(0, 4)
      : [],
    raid_attention_items: Array.isArray(withRag.raid_attention_items)
      ? withRag.raid_attention_items.slice(0, 6)
      : [],
    decision_impact_statements: Array.isArray(withRag.decision_impact_statements)
      ? withRag.decision_impact_statements
      : [],
    financial_kpis: financialKpis
      ? {
          ...financialKpis,
          engagement_model: normalizeEngagementModel(
            financialKpis.engagement_model,
            fallbackEngagementModel,
          ),
        }
      : withRag.financial_kpis,
  };
  return reportOutputSchema.safeParse(normalized);
}

function describeValidationFailure(
  rawText: string,
  validated: ReturnType<typeof reportOutputSchema.safeParse> | null,
): string {
  if (!validated) {
    const trimmed = rawText.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes("}")) {
      return "invalid_or_truncated_json";
    }
    return "json_parse_failed";
  }
  if (!validated.success) {
    return validated.error.issues[0]?.path.join(".") || "schema";
  }
  return "unknown";
}

export async function generateReport(input: ReportInput, actor?: UsageActor): Promise<ReportOutput> {
  const missingField = validateRequiredReportInput(input);
  if (missingField) {
    throw new Error(`Missing or invalid field: ${missingField}`);
  }

  const llm = getLlmClient();
  if (!llm.isConfigured()) {
    throw new Error(llm.missingConfigMessage);
  }

  let tokens = emptyUsage();

  try {
    const session = `dp-report:${input.projectData.projectName}`.slice(0, 200);
    const initial = await llm.complete({
      system: REPORT_SYSTEM_PROMPT,
      user: buildReportUserPrompt(input),
      maxTokens: REPORT_MAX_OUTPUT_TOKENS,
      temperature: 0,
      session,
    });
    tokens = addUsage(tokens, initial);
    let validated;
    try {
      validated = parseAndValidate(initial.text, input);
    } catch {
      validated = null;
    }

    if (!validated || !validated.success) {
      const firstFieldPath = describeValidationFailure(initial.text, validated);
      const repairPrompt = `
The previous answer failed schema validation or JSON parsing (${firstFieldPath}).
Return ONLY one complete valid JSON object. No markdown. No prose.
Include ALL required top-level fields:
rag_status, rag_reason, rag_ai_suggested, schedule_variance_days, schedule_variance_narrative, timeline_progress_percent, executive_summary, highlights_wins, highlights_concerns, forecast, workstream_analysis, raid_attention_items, raid_summary, financial_kpis, financial_narrative, eac_overrun_flag, cr_summary, decision_impact_statements, commercial_summary_sentence.
rag_status and rag_ai_suggested must be exactly "RED", "AMBER", or "GREEN".
financial_kpis.engagement_model must be exactly "${input.commercialData.engagementModel}" (either "TNM" or "FP").
Keep narratives concise so the full object fits in one response.
If a value is unknown, use null for nullable fields or [] for array fields but do not omit any required key.

Regenerate the full ReportOutput from this project input:
${JSON.stringify(input)}
`;

      const repaired = await llm.complete({
        system: REPORT_SYSTEM_PROMPT,
        user: repairPrompt,
        maxTokens: REPORT_MAX_OUTPUT_TOKENS,
        temperature: 0,
        session,
      });
      tokens = addUsage(tokens, repaired);
      try {
        validated = parseAndValidate(repaired.text, input);
      } catch {
        validated = null;
      }

      if (!validated || !validated.success) {
        const fieldPath = describeValidationFailure(repaired.text, validated);
        throw new Error(`LLM response missing/invalid field after retry: ${fieldPath}`);
      }
    }

    await recordGenerateUsage(actor, "SUCCESS", tokens, llm.provider, llm.model);
    return validated.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM API error";
    await recordGenerateUsage(actor, "FAILURE", tokens, llm.provider, llm.model, message);
    throw error;
  }
}
