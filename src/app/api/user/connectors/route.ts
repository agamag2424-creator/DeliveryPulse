import { NextResponse } from "next/server";
import { z } from "zod";

import { isConnectorOAuthConfigured } from "@/lib/connectors/catalog";
import { CONNECTOR_TYPES } from "@/lib/connectors/types";
import { disconnectOrgIntegration, mappedResourceName } from "@/lib/db/connectors";
import { requireOrgPermission } from "@/lib/org/context";
import { can } from "@/lib/org/permissions";
import { prisma } from "@/lib/prisma";

type ConnectorListItem = {
  id: string;
  projectId: string | null;
  projectName: string;
  type: string;
  status: string;
  jiraProjectName: string | null;
  mappedName: string | null;
  lastSyncedAt: string | null;
  isOrgIntegration: boolean;
};

export async function GET() {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const integrations = await prisma.organizationIntegration.findMany({
    where: { organizationId: gated.ctx.organizationId },
    include: {
      bindings: { include: { project: { select: { id: true, name: true, isArchived: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const oauthConfigured = Object.fromEntries(
    CONNECTOR_TYPES.map((type) => [type, isConnectorOAuthConfigured(type)]),
  ) as Record<(typeof CONNECTOR_TYPES)[number], boolean>;

  return NextResponse.json({
    jiraOAuthConfigured: oauthConfigured.JIRA,
    oauthConfigured,
    canManage: can(gated.ctx.role, "integration.manage"),
    connectors: integrations.flatMap((integration): ConnectorListItem[] => {
      const liveBindings = integration.bindings.filter((binding) => !binding.project.isArchived);
      if (liveBindings.length === 0) {
        return [
          {
            id: integration.id,
            projectId: null,
            projectName: "Organization",
            type: integration.type,
            status: integration.status,
            jiraProjectName: null,
            mappedName: null,
            lastSyncedAt: integration.lastSyncedAt?.toISOString() ?? null,
            isOrgIntegration: true,
          },
        ];
      }
      return liveBindings.map((binding) => {
        const mappedName = mappedResourceName(integration.type, binding.config);
        return {
          id: integration.id,
          projectId: binding.projectId,
          projectName: binding.project.name,
          type: integration.type,
          status: integration.status === "DISCONNECTED" ? "DISCONNECTED" : binding.status,
          jiraProjectName: mappedName,
          mappedName,
          lastSyncedAt: binding.lastSyncedAt?.toISOString() ?? integration.lastSyncedAt?.toISOString() ?? null,
          isOrgIntegration: true,
        };
      });
    }),
  });
}

const deleteSchema = z.object({ connectorId: z.string().min(1) });

export async function DELETE(request: Request) {
  const gated = await requireOrgPermission("integration.manage");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = deleteSchema.parse(await request.json());
    const removed = await disconnectOrgIntegration(gated.ctx.organizationId, body.connectorId);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
