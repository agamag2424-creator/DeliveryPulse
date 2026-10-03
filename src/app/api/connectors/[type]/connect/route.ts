import { NextResponse } from "next/server";
import { z } from "zod";

import { parseManagedConnectorType } from "@/lib/connectors/route-type";
import { fetchConnectorPreview } from "@/lib/connectors/runtime";
import { parseExternalConfig } from "@/lib/connectors/types";
import {
  assertProjectInOrganization,
  confirmConnector,
  getConnectorForProject,
  updateExternalConnectorConfig,
} from "@/lib/db/connectors";
import { requireOrgPermission } from "@/lib/org/context";

const selectSchema = z.object({
  projectId: z.string().min(1),
  externalId: z.string().min(1),
  externalKey: z.string().min(1),
  externalName: z.string().min(1),
});

export async function POST(
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

  try {
    const body = selectSchema.parse(await request.json());
    await assertProjectInOrganization(body.projectId, gated.ctx.organizationId);

    const connector = await getConnectorForProject(body.projectId, type);
    if (!connector) {
      return NextResponse.json({ error: `${type} is not connected for this project` }, { status: 404 });
    }
    if (connector.status === "DISCONNECTED") {
      return NextResponse.json({ error: "Connector is disconnected. Please reconnect." }, { status: 409 });
    }

    const updated = await updateExternalConnectorConfig(connector.id, {
      externalId: body.externalId,
      externalKey: body.externalKey,
      externalName: body.externalName,
      setupComplete: false,
    });

    const preview = await fetchConnectorPreview(updated);
    return NextResponse.json({
      connector: {
        id: updated.id,
        status: updated.status,
        setupComplete: false,
        mappedName: body.externalName,
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
    console.error(`${type} resource selection failed:`, error);
    return NextResponse.json({ error: "Failed to map resource" }, { status: 500 });
  }
}

const confirmSchema = z.object({
  projectId: z.string().min(1),
});

export async function PUT(
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

  try {
    const body = confirmSchema.parse(await request.json());
    await assertProjectInOrganization(body.projectId, gated.ctx.organizationId);

    const connector = await getConnectorForProject(body.projectId, type);
    if (!connector) {
      return NextResponse.json({ error: `${type} is not connected for this project` }, { status: 404 });
    }

    const config = parseExternalConfig(connector.config);
    if (!config.externalId) {
      return NextResponse.json({ error: "Select a resource before confirming" }, { status: 400 });
    }

    const confirmed = await confirmConnector(connector.id);
    return NextResponse.json({
      connector: {
        id: confirmed.id,
        status: confirmed.status,
        setupComplete: true,
        mappedName: config.externalName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(`${type} confirmation failed:`, error);
    return NextResponse.json({ error: "Failed to confirm connection" }, { status: 500 });
  }
}
