import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/lib/org/context";
import { getUsageSnapshot } from "@/lib/usage/quota";

export async function GET() {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const snapshot = await getUsageSnapshot(gated.ctx.organizationId);
  return NextResponse.json(snapshot);
}
