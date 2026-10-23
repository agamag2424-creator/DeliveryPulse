import { NextResponse } from "next/server";
import { z } from "zod";

import { resumeSynthesisAgent } from "@/lib/agent/synthesisAgent";
import type { AgentResumeState } from "@/lib/agent/types";
import { requireOrgPermission } from "@/lib/org/context";
import { assertProjectInOrganization } from "@/lib/db/connectors";
import { assertReportQuota, isQuotaExceededError, quotaExceededResponse } from "@/lib/usage/quota";

const gapsSchema = z.object({
  projectId: z.string().min(1),
  pmAnswers: z.record(z.string(), z.string()),
  agentState: z.object({
    projectId: z.string(),
    userId: z.string(),
    connectorData: z.unknown().nullable(),
    normalisedInput: z.record(z.string(), z.unknown()).or(z.object({}).passthrough()),
    gaps: z.array(
      z.object({
        field: z.string(),
        label: z.string(),
        reason: z.string(),
        isCritical: z.boolean(),
      }),
    ),
    completeness: z.object({
      score: z.number(),
      populatedFields: z.array(z.string()),
      missingFields: z.array(z.string()),
      lowConfidenceFields: z.array(z.string()),
    }),
  }),
});

export async function POST(request: Request) {
  const gated = await requireOrgPermission("report.generate");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = gapsSchema.parse(await request.json());
    await assertProjectInOrganization(body.projectId, gated.ctx.organizationId);
    await assertReportQuota(gated.ctx.organizationId);

    if (body.agentState.userId !== gated.ctx.userId || body.agentState.projectId !== body.projectId) {
      return NextResponse.json({ status: "ERROR", error: "Invalid agent session" }, { status: 403 });
    }

    const result = await resumeSynthesisAgent(body.agentState as AgentResumeState, body.pmAnswers);

    if (result.status === "GAPS") {
      return NextResponse.json({
        status: "GAPS",
        gaps: result.gaps,
        partialInput: result.partialInput,
        completeness: result.completeness,
        agentState: result.agentState,
      });
    }

    if (result.status === "ERROR") {
      return NextResponse.json({ status: "ERROR", error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      status: "COMPLETE",
      reportOutput: result.reportOutput,
      reportId: result.reportId,
    });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return quotaExceededResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ status: "ERROR", error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ status: "ERROR", error: "Project not found" }, { status: 404 });
    }
    console.error("Agent gap fill failed:", error);
    return NextResponse.json({ status: "ERROR", error: "Gap fill failed" }, { status: 500 });
  }
}
