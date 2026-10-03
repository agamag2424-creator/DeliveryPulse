import { NextResponse } from "next/server";

import { CONNECTOR_CATALOG, isConnectorOAuthConfigured } from "@/lib/connectors/catalog";
import { parseManagedConnectorType } from "@/lib/connectors/route-type";
import { parseExternalConfig } from "@/lib/connectors/types";
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

  const catalog = CONNECTOR_CATALOG[type];
  const connector = await getConnectorForProject(projectId, type);
  if (!connector) {
    return NextResponse.json({
      connected: false,
      status: null,
      setupComplete: false,
      mappedName: null,
      oauthConfigured: isConnectorOAuthConfigured(type),
      type,
      label: catalog.label,
    });
  }

  const config = parseExternalConfig(connector.config);
  return NextResponse.json({
    connected: true,
    connectorId: connector.id,
    status: connector.status,
    setupComplete: config.setupComplete,
    mappedName: config.externalName || null,
    lastSyncedAt: connector.lastSyncedAt?.toISOString() ?? null,
    lastSyncError: connector.lastSyncError,
    oauthConfigured: isConnectorOAuthConfigured(type),
    type,
    label: catalog.label,
  });
}
