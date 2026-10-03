import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/lib/org/context";
import {
  assertProjectInOrganization,
  getJiraConnectorForProject,
  parseJiraConfig,
} from "@/lib/db/connectors";
import { isJiraOAuthConfigured } from "@/lib/connectors/jira/oauth";

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

  const connector = await getJiraConnectorForProject(projectId);
  if (!connector) {
    return NextResponse.json({
      connected: false,
      status: null,
      setupComplete: false,
      jiraProjectName: null,
      oauthConfigured: isJiraOAuthConfigured(),
    });
  }

  const config = parseJiraConfig(connector.config);

  return NextResponse.json({
    connected: true,
    connectorId: connector.id,
    status: connector.status,
    setupComplete: config.setupComplete,
    jiraProjectKey: config.jiraProjectKey || null,
    jiraProjectName: config.jiraProjectName || null,
    lastSyncedAt: connector.lastSyncedAt?.toISOString() ?? null,
    lastSyncError: connector.lastSyncError,
    oauthConfigured: isJiraOAuthConfigured(),
  });
}
