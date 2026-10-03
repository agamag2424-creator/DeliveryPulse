import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/lib/org/context";
import { getReport } from "@/lib/db/reports";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const { id } = await context.params;
  const report = await getReport(gated.ctx.organizationId, id);
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ report });
}
