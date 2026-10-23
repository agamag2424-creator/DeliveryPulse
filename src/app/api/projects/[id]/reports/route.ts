import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/lib/org/context";
import { getReports, saveReport } from "@/lib/db/reports";
import type { ReportOutput } from "@/lib/reportOutputSchema";
import type { ReportInput } from "@/types/report";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const { id } = await context.params;
  const reports = await getReports(gated.ctx.organizationId, id);
  return NextResponse.json({ reports });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const gated = await requireOrgPermission("report.generate");
  if ("response" in gated) {
    return gated.response;
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { input: ReportInput; output: ReportOutput };
    if (!body.input || !body.output) {
      return NextResponse.json({ error: "Missing input or output" }, { status: 400 });
    }

    const report = await saveReport(gated.ctx.organizationId, gated.ctx.userId, id, body.input, body.output);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Save report failed:", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
