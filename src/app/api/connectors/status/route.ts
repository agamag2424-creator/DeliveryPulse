import { NextResponse } from "next/server";

import { CONNECTOR_TYPES, parseExternalConfig } from "@/lib/connectors/types";
import {
  assertProjectInOrganization,
  getActiveConnectorsForProject,
  getConnectorForProject,
  JIRA_CONNECTOR_TYPE,
  parseJiraConfig,
} from "@/lib/db/connectors";
import { requireOrgPermission } from "@/lib/org/context";

export async function GET(request: Request) {
  const gated = await requireOrgPermission("connector.map");
  if ("response" in gated) {
    return gated.response;
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

  const active = await getActiveConnectorsForProject(projectId);
  const anyActive = active.some((connector) => {
    if (connector.type === JIRA_CONNECTOR_TYPE) {
      return parseJiraConfig(connector.config).setupComplete;
    }
    return parseExternalConfig(connector.config).setupComplete;
  });

  const bindings = await Promise.all(
    CONNECTOR_TYPES.map(async (type) => {
      const connector = await getConnectorForProject(projectId, type);
      return { type, connected: Boolean(connector), status: connector?.status ?? null };
    }),
  );

  return NextResponse.json({ anyActive, bindings });
}
