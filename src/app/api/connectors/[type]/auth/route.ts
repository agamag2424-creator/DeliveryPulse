import { NextResponse } from "next/server";

import { parseManagedConnectorType } from "@/lib/connectors/route-type";
import { startConnectorOAuth } from "@/lib/connectors/start-auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const { type: slug } = await context.params;
  const type = parseManagedConnectorType(slug);
  if (!type) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }
  return startConnectorOAuth(request, type);
}
