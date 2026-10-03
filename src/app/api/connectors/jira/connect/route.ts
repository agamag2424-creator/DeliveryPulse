import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOrgPermission } from "@/lib/org/context";
import {
  assertProjectInOrganization,
  confirmJiraConnector,
  getJiraConnectorForProject,
  parseJiraConfig,
  updateJiraConnectorConfig,
} from "@/lib/db/connectors";
import { resolveBoardForProject } from "@/lib/connectors/jira/discover";
import { fetchJiraPreviewData } from "@/lib/connectors/jira/fetch";

const selectSchema = z.object({
  projectId: z.string().min(1),
  jiraProjectId: z.string().min(1),
  jiraProjectKey: z.string().min(1),
  jiraProjectName: z.string().min(1),
});

export async function POST(request: Request) {
  const gated = await requireOrgPermission("connector.map");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = selectSchema.parse(await request.json());
    await assertProjectInOrganization(body.projectId, gated.ctx.organizationId);

    const connector = await getJiraConnectorForProject(body.projectId);
    if (!connector) {
      return NextResponse.json({ error: "Jira is not connected for this project" }, { status: 404 });
    }

    if (connector.status === "DISCONNECTED") {
      return NextResponse.json({ error: "Jira connector is disconnected. Please reconnect." }, { status: 409 });
    }

    const boardId = await resolveBoardForProject(connector.id, body.jiraProjectKey);

    const updated = await updateJiraConnectorConfig(connector.id, {
      jiraProjectId: body.jiraProjectId,
      jiraProjectKey: body.jiraProjectKey,
      jiraProjectName: body.jiraProjectName,
      boardId,
      setupComplete: false,
    });

    const preview = await fetchJiraPreviewData(updated.id);

    return NextResponse.json({
      connector: {
        id: updated.id,
        status: updated.status,
        setupComplete: false,
        jiraProjectName: body.jiraProjectName,
      },
      preview,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("Jira project selection failed:", error);
    return NextResponse.json({ error: "Failed to connect Jira project" }, { status: 500 });
  }
}

const confirmSchema = z.object({
  projectId: z.string().min(1),
});

export async function PUT(request: Request) {
  const gated = await requireOrgPermission("connector.map");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = confirmSchema.parse(await request.json());
    await assertProjectInOrganization(body.projectId, gated.ctx.organizationId);

    const connector = await getJiraConnectorForProject(body.projectId);
    if (!connector) {
      return NextResponse.json({ error: "Jira is not connected for this project" }, { status: 404 });
    }

    const config = parseJiraConfig(connector.config);
    if (!config.jiraProjectKey) {
      return NextResponse.json({ error: "Select a Jira project before confirming" }, { status: 400 });
    }

    const confirmed = await confirmJiraConnector(connector.id);

    return NextResponse.json({
      connector: {
        id: confirmed.id,
        status: confirmed.status,
        setupComplete: true,
        jiraProjectName: config.jiraProjectName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("Jira connector confirmation failed:", error);
    return NextResponse.json({ error: "Failed to confirm Jira connection" }, { status: 500 });
  }
}
