import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { buildReportUserPrompt, REPORT_SYSTEM_PROMPT } from "@/lib/claudeReportPrompt";
import { reportOutputSchema } from "@/lib/reportOutputSchema";
import type { ReportInput } from "@/types/report";

function validateRequiredInput(reportInput: ReportInput) {
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

async function getClaudeText(anthropic: Anthropic, userPrompt: string) {
  const claudeResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    temperature: 0,
    system: REPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  return claudeResponse.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

function parseAndValidate(rawText: string) {
  let raw = rawText.trim();
  raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  raw = raw.replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const normalized = {
    ...parsed,
    highlights_wins: Array.isArray(parsed.highlights_wins) ? parsed.highlights_wins.slice(0, 4) : [],
    highlights_concerns: Array.isArray(parsed.highlights_concerns)
      ? parsed.highlights_concerns.slice(0, 4)
      : [],
    raid_attention_items: Array.isArray(parsed.raid_attention_items)
      ? parsed.raid_attention_items.slice(0, 6)
      : [],
    decision_impact_statements: Array.isArray(parsed.decision_impact_statements)
      ? parsed.decision_impact_statements
      : [],
  };
  return reportOutputSchema.safeParse(normalized);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportInput;
    const missingField = validateRequiredInput(body);
    if (missingField) {
      return NextResponse.json({ error: `Missing or invalid field: ${missingField}` }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not configured. Add it to .env.local for local dev, then restart `npm run dev`.",
        },
        { status: 500 },
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const initialText = await getClaudeText(anthropic, buildReportUserPrompt(body));
    console.log("CLAUDE_RAW_RESPONSE_START");
    console.log(initialText);
    console.log("CLAUDE_RAW_RESPONSE_END");
    let validated;
    try {
      validated = parseAndValidate(initialText);
    } catch {
      validated = null;
    }

    if (!validated || !validated.success) {
      const firstFieldPath = validated?.error.issues[0]?.path.join(".") ?? "unknown";
      const repairPrompt = `
The previous answer failed schema validation or JSON parsing.
Return ONLY valid JSON and include ALL required top-level fields:
rag_status, rag_reason, rag_ai_suggested, schedule_variance_days, schedule_variance_narrative, timeline_progress_percent, executive_summary, highlights_wins, highlights_concerns, forecast, workstream_analysis, raid_attention_items, raid_summary, financial_kpis, financial_narrative, eac_overrun_flag, cr_summary, decision_impact_statements, commercial_summary_sentence.
Critical: the previous response was invalid at field path: ${firstFieldPath}
If a value is unknown, use null (or [] for array fields) but do not omit any required key.

Previous invalid answer:
${initialText}
`;

      const repairedText = await getClaudeText(anthropic, repairPrompt);
      try {
        validated = parseAndValidate(repairedText);
      } catch {
        validated = null;
      }

      if (!validated || !validated.success) {
        const fieldPath = validated?.error.issues[0]?.path.join(".") ?? "rag_status";
        return NextResponse.json(
          { error: `Claude response missing/invalid field after retry: ${fieldPath}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Claude API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
