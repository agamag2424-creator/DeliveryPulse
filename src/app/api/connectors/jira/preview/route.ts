import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/lib/org/context";
import {
  assertProjectInOrganization,
  getJiraConnectorForProject,
  parseJiraConfig,
} from "@/lib/db/connectors";
import { fetchJiraPreviewData } from "@/lib/connectors/jira/fetch";

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
    return NextResponse.json({ error: "Jira is not connected for this project" }, { status: 404 });
  }

  const config = parseJiraConfig(connector.config);
  if (!config.jiraProjectKey) {
    return NextResponse.json({ error: "Jira project is not selected yet" }, { status: 400 });
  }

  if (connector.status === "DISCONNECTED") {
    return NextResponse.json({ error: "Jira connector is disconnected. Please reconnect." }, { status: 409 });
  }

  try {
    const preview = await fetchJiraPreviewData(connector.id);
    return NextResponse.json({ preview, connector: { id: connector.id, status: connector.status } });
  } catch (error) {
    console.error("Jira preview failed:", error);
    return NextResponse.json({ error: "Failed to load Jira preview" }, { status: 500 });
  }
}
