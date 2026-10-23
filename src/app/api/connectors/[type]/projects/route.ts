import { NextResponse } from "next/server";

import { parseManagedConnectorType } from "@/lib/connectors/route-type";
import { listConnectorResources } from "@/lib/connectors/runtime";
import { assertProjectInOrganization, getConnectorForProject } from "@/lib/db/connectors";
import { requireOrgPermission } from "@/lib/org/context";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const gated = await requireOrgPermission("connector.map");
  if ("response" in gated) {
    return gated.response;
  }

  const { type: slug } = await context.params;
  const type = parseManagedConnectorType(slug);
  if (!type) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectInOrganization(projectId, gated.ctx.organizationId);
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const connector = await getConnectorForProject(projectId, type);
  if (!connector) {
    return NextResponse.json({ error: `${type} is not connected for this project` }, { status: 404 });
  }

  try {
    const projects = await listConnectorResources(connector);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error(`Failed to list ${type} resources:`, error);
    return NextResponse.json({ error: "Failed to list resources" }, { status: 500 });
  }
}
