import { NextResponse } from "next/server";
import { z } from "zod";

import { runSynthesisAgent } from "@/lib/agent/synthesisAgent";
import { requireOrgPermission } from "@/lib/org/context";
import { assertProjectInOrganization } from "@/lib/db/connectors";
import { assertReportQuota, isQuotaExceededError, quotaExceededResponse } from "@/lib/usage/quota";

const runSchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: Request) {
  const gated = await requireOrgPermission("report.generate");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = runSchema.parse(await request.json());
    await assertProjectInOrganization(body.projectId, gated.ctx.organizationId);
    await assertReportQuota(gated.ctx.organizationId);

    const result = await runSynthesisAgent(body.projectId, gated.ctx.userId);

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
    console.error("Agent run failed:", error);
    return NextResponse.json({ status: "ERROR", error: "Agent run failed" }, { status: 500 });
  }
}
