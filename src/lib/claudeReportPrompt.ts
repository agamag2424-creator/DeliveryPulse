// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

import type { ReportInput } from "@/types/report";

// E3 source-of-truth prompt from backlog; keep schema instructions aligned with ReportOutput.
export const REPORT_SYSTEM_PROMPT = `You are a JSON API. You return only raw JSON.
You never write prose, explanations, or markdown.
You never wrap output in backticks or code fences.
Your entire response must be a single valid JSON object
that can be passed directly to JSON.parse() with no
preprocessing. If you cannot determine a value, use null.
Never omit a required field.`;

export function buildReportUserPrompt(reportInput: ReportInput) {
  return `
Generate a DeliveryPulse ReportOutput JSON object from this project input.

Rules:
- Return only JSON.
- Use exactly the required field names.
- Do not add extra fields.
- RAID curation rules:
  - unowned risk always flag
  - issue open 7+ days always flag
  - blocking dependency always flag
  - unvalidated high-impact assumption always flag
- Workstream RAG weights:
  - Velocity 30%, Blockers 30%, Capacity 20%, Dependencies 20%
- Velocity thresholds:
  - >=80 Green, 50-79 Amber, <50 Red
- Financial thresholds:
  - consumed > 90% => Red
  - consumed > 70% with scope delivered < 60% => Amber
  - EAC > contract => Red
  - variance within 5% => Amber
- Forecast:
  - infer week+1 and week+2 optimistic/base/pessimistic from trend + free text context

Input JSON:
${JSON.stringify(reportInput, null, 2)}

CRITICAL: Your response must include ALL of these top-level
fields with exactly these names:
rag_status, rag_reason, rag_ai_suggested,
schedule_variance_days, schedule_variance_narrative,
timeline_progress_percent, executive_summary,
highlights_wins, highlights_concerns, forecast,
workstream_analysis, raid_attention_items, raid_summary,
financial_kpis, financial_narrative, eac_overrun_flag,
cr_summary, decision_impact_statements,
commercial_summary_sentence

rag_status must be exactly one of: "RED", "AMBER", "GREEN"
highlights_wins must be an array of strings.
highlights_concerns must be an array of strings.
workstream_analysis[].blocker_type must be exactly one of:
"none", "internal", "external" — all lowercase, no other values.
"none" = no active blockers.
"internal" = blockers raised by the delivery team internally.
"external" = blockers from client, vendor, or outside the team.
If a workstream has both internal and external blockers, use "external"
as it represents the harder-to-resolve condition.

Use this exact JSON shape (fill values, do not change keys):
{
  "rag_status": "RED|AMBER|GREEN",
  "rag_reason": "string",
  "rag_ai_suggested": "RED|AMBER|GREEN",
  "schedule_variance_days": 0,
  "schedule_variance_narrative": "string",
  "timeline_progress_percent": 0,
  "executive_summary": "string",
  "highlights_wins": ["string"],
  "highlights_concerns": ["string"],
  "forecast": {
    "budget_burn": {
      "week_plus_1_base": 0,
      "week_plus_1_optimistic": 0,
      "week_plus_1_pessimistic": 0,
      "week_plus_2_base": 0,
      "week_plus_2_optimistic": 0,
      "week_plus_2_pessimistic": 0,
      "narrative": "string",
      "forecast_rag": "RED|AMBER|GREEN"
    },
    "scope_completion": {
      "week_plus_1_base": 0,
      "week_plus_1_optimistic": 0,
      "week_plus_1_pessimistic": 0,
      "week_plus_2_base": 0,
      "week_plus_2_optimistic": 0,
      "week_plus_2_pessimistic": 0,
      "narrative": "string",
      "forecast_rag": "RED|AMBER|GREEN"
    },
    "schedule_health": {
      "week_plus_1_base": 0,
      "week_plus_1_optimistic": 0,
      "week_plus_1_pessimistic": 0,
      "week_plus_2_base": 0,
      "week_plus_2_optimistic": 0,
      "week_plus_2_pessimistic": 0,
      "narrative": "string",
      "forecast_rag": "RED|AMBER|GREEN"
    }
  },
  "workstream_analysis": [{
    "workstream_name": "string",
    "overall_rag": "RED|AMBER|GREEN",
    "velocity_percent": 0,
    "velocity_rag": "RED|AMBER|GREEN",
    "blocker_count": 0,
    "blocker_type": "none|internal|external",
    "capacity_rag": "RED|AMBER|GREEN",
    "dependency_rag": "RED|AMBER|GREEN",
    "blocker_details": [{
      "description": "string",
      "type": "Internal|External|Client|Vendor",
      "days_open": 0,
      "owner": "string",
      "impact": "string"
    }],
    "rag_score_breakdown": {
      "velocity_score": 0,
      "blocker_score": 0,
      "capacity_score": 0,
      "dependency_score": 0,
      "weighted_total": 0
    }
  }],
  "raid_attention_items": [{
    "category": "RISK|ISSUE|DEPENDENCY|ASSUMPTION",
    "title": "string",
    "rag": "RED|AMBER",
    "severity_label": "string",
    "owner": "string|Unowned",
    "threatens": "string",
    "action_required": "string",
    "linked_decision": true,
    "days_open": 0,
    "score": 0
  }],
  "raid_summary": {
    "risks": { "total": 0, "attention": 0, "managed": 0, "rag": "RED|AMBER|GREEN|GREY", "top_item": "string" },
    "issues": { "total": 0, "attention": 0, "managed": 0, "rag": "RED|AMBER|GREEN|GREY", "top_item": "string" },
    "dependencies": { "total": 0, "attention": 0, "managed": 0, "rag": "RED|AMBER|GREEN|GREY", "top_item": "string" },
    "assumptions": { "total": 0, "attention": 0, "managed": 0, "rag": "RED|AMBER|GREEN|GREY", "top_item": "string" }
  },
  "financial_kpis": {
    "contract_value": 0,
    "currency": "string",
    "consumed_to_date": 0,
    "consumed_percent": 0,
    "consumed_rag": "RED|AMBER|GREEN",
    "remaining": 0,
    "forecast_final": 0,
    "variance": 0,
    "variance_percent": 0,
    "variance_rag": "RED|AMBER|GREEN",
    "engagement_model": "TNM|FP"
  },
  "financial_narrative": "string",
  "eac_overrun_flag": false,
  "cr_summary": "string",
  "decision_impact_statements": [{ "decision_title": "string", "impact": "string" }],
  "commercial_summary_sentence": "string"
}
`;
}

export function stripMarkdownFences(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return trimmed;
}
