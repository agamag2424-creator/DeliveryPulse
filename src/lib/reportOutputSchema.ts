import { z } from "zod";

const ragSchema = z.enum(["RED", "AMBER", "GREEN"]);
const extendedRagSchema = z.enum(["RED", "AMBER", "GREEN", "GREY"]);

const forecastMetricSchema = z.object({
  week_plus_1_base: z.number(),
  week_plus_1_optimistic: z.number(),
  week_plus_1_pessimistic: z.number(),
  week_plus_2_base: z.number(),
  week_plus_2_optimistic: z.number(),
  week_plus_2_pessimistic: z.number(),
  narrative: z.string(),
  forecast_rag: ragSchema,
});

const workstreamAnalysisSchema = z.object({
  workstream_name: z.string(),
  overall_rag: ragSchema,
  velocity_percent: z.number(),
  velocity_rag: ragSchema,
  blocker_count: z.number(),
  blocker_type: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(z.enum(["none", "internal", "external"])),
  capacity_rag: ragSchema,
  dependency_rag: ragSchema,
  blocker_details: z.array(
    z.object({
      description: z.string(),
      type: z.enum(["Internal", "External", "Client", "Vendor"]),
      days_open: z.number(),
      owner: z.string(),
      impact: z.string(),
    }),
  ),
  rag_score_breakdown: z.object({
    velocity_score: z.number(),
    blocker_score: z.number(),
    capacity_score: z.number(),
    dependency_score: z.number(),
    weighted_total: z.number(),
  }),
});

const raidAttentionItemSchema = z.object({
  category: z
    .string()
    .transform((val) => val.toUpperCase())
    .pipe(z.enum(["RISK", "ISSUE", "DEPENDENCY", "ASSUMPTION"])),
  title: z.string(),
  rag: z.enum(["RED", "AMBER"]),
  severity_label: z.string(),
  owner: z.union([z.string(), z.literal("Unowned")]),
  threatens: z.string(),
  action_required: z.string(),
  linked_decision: z.boolean(),
  days_open: z.number().nullable().optional(),
  score: z.number().nullable().optional(),
});

const raidSummaryCategorySchema = z.object({
  total: z.number(),
  attention: z.number(),
  managed: z.number(),
  rag: extendedRagSchema,
  top_item: z.string(),
});

const financialKPISchema = z.object({
  contract_value: z.number(),
  currency: z.string(),
  consumed_to_date: z.number(),
  consumed_percent: z.number(),
  consumed_rag: ragSchema,
  remaining: z.number(),
  forecast_final: z.number(),
  variance: z.number(),
  variance_percent: z.number(),
  variance_rag: ragSchema,
  engagement_model: z
    .string()
    .transform((val) => val.trim().toUpperCase().replace(/[^A-Z]/g, ""))
    .transform((val) => {
      if (val === "TM" || val === "TAM" || val === "TIMEANDMATERIALS") return "TNM";
      return val;
    })
    .pipe(z.enum(["TNM", "FP"])),
});

// E3 source-of-truth schema from backlog; keep in sync with slides/context usage.
export const reportOutputSchema = z.object({
  rag_status: ragSchema,
  rag_reason: z.string(),
  rag_ai_suggested: ragSchema,
  schedule_variance_days: z.number(),
  schedule_variance_narrative: z.string(),
  timeline_progress_percent: z.number(),
  executive_summary: z.string(),
  highlights_wins: z.array(z.string()).max(4),
  highlights_concerns: z.array(z.string()).max(4),
  forecast: z.object({
    budget_burn: forecastMetricSchema,
    scope_completion: forecastMetricSchema,
    schedule_health: forecastMetricSchema,
  }),
  workstream_analysis: z.array(workstreamAnalysisSchema),
  raid_attention_items: z.array(raidAttentionItemSchema).max(6),
  raid_summary: z.object({
    risks: raidSummaryCategorySchema,
    issues: raidSummaryCategorySchema,
    dependencies: raidSummaryCategorySchema,
    assumptions: raidSummaryCategorySchema,
  }),
  financial_kpis: financialKPISchema,
  financial_narrative: z.string(),
  eac_overrun_flag: z.boolean(),
  cr_summary: z.string(),
  decision_impact_statements: z.array(
    z.object({
      decision_title: z.string(),
      impact: z.string(),
    }),
  ),
  commercial_summary_sentence: z.string(),
});

export type ReportOutput = z.infer<typeof reportOutputSchema>;
