// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.
// Epic 0 (SaaS launch backlog): session check on POST — explicit instruction. Matches agent routes.
// Epic 3 (SaaS launch backlog): org quota check on POST before Claude — explicit instruction.

import { NextResponse } from "next/server";

import { generateReport } from "@/lib/claude/generateReport";
import { requireOrgPermission } from "@/lib/org/context";
import { assertReportQuota, isQuotaExceededError, quotaExceededResponse } from "@/lib/usage/quota";
import type { ReportInput } from "@/types/report";

export async function POST(request: Request) {
  const gated = await requireOrgPermission("report.generate");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    await assertReportQuota(gated.ctx.organizationId);
    const body = (await request.json()) as ReportInput;
    const reportOutput = await generateReport(body, {
      organizationId: gated.ctx.organizationId,
      userId: gated.ctx.userId,
    });
    return NextResponse.json(reportOutput);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return quotaExceededResponse(error);
    }
    const message = error instanceof Error ? error.message : "Unknown Claude API error";
    const status = message.startsWith("Missing or invalid field") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
