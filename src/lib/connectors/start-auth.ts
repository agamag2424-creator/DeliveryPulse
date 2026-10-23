import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { CONNECTOR_CATALOG, isConnectorOAuthConfigured } from "@/lib/connectors/catalog";
import { buildAsanaAuthorizeUrl } from "@/lib/connectors/asana/oauth";
import { buildMondayAuthorizeUrl } from "@/lib/connectors/monday/oauth";
import { encodeOAuthState } from "@/lib/connectors/oauth-state";
import { buildTrelloAuthorizeUrl } from "@/lib/connectors/trello/oauth";
import type { ConnectorType } from "@/lib/connectors/types";
import { connectorTypeToSlug } from "@/lib/connectors/types";
import { assertProjectInOrganization, ensureBinding } from "@/lib/db/connectors";
import { can } from "@/lib/org/permissions";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/prisma";

function setupQuery(type: ConnectorType): string {
  return type === "JIRA" ? "jiraSetup=true" : `setup=${connectorTypeToSlug(type)}`;
}

function buildAuthorizeUrl(type: ConnectorType, state: string, requestUrl: string): string {
  switch (type) {
    case "JIRA":
      throw new Error("Use the Jira auth route");
    case "ASANA":
      return buildAsanaAuthorizeUrl(state);
    case "MONDAY":
      return buildMondayAuthorizeUrl(state);
    case "TRELLO": {
      const complete = new URL("/connectors/trello/complete", requestUrl);
      complete.searchParams.set("state", state);
      return buildTrelloAuthorizeUrl(complete.toString());
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export async function startConnectorOAuth(request: Request, type: ConnectorType): Promise<NextResponse> {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const reconnect = searchParams.get("reconnect") === "true";
  const catalog = CONNECTOR_CATALOG[type];

  if (projectId) {
    try {
      await assertProjectInOrganization(projectId, ctx.organizationId);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const integration = await prisma.organizationIntegration.findUnique({
    where: {
      organizationId_type: { organizationId: ctx.organizationId, type },
    },
  });

  const needsNewGrant = !integration || reconnect || integration.status === "DISCONNECTED";
  if (needsNewGrant && !can(ctx.role, "integration.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!needsNewGrant && projectId && !can(ctx.role, "connector.map")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!needsNewGrant && !projectId && !can(ctx.role, "integration.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (integration && !needsNewGrant && projectId) {
    await ensureBinding(projectId, type, integration.id);
    return NextResponse.redirect(new URL(`/projects/${projectId}?${setupQuery(type)}`, request.url));
  }

  if (!isConnectorOAuthConfigured(type)) {
    const fallback = projectId
      ? `/projects/${projectId}?${setupQuery(type)}&connectorUnavailable=local`
      : `/settings?tab=tools&connectorUnavailable=${catalog.slug}`;
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  try {
    const state = encodeOAuthState({
      organizationId: ctx.organizationId,
      projectId: projectId ?? undefined,
      nonce: randomBytes(16).toString("hex"),
    });
    return NextResponse.redirect(buildAuthorizeUrl(type, state, request.url));
  } catch (error) {
    console.error(`${catalog.label} auth initiation failed:`, error);
    const message = error instanceof Error ? error.message : `${catalog.label} OAuth is not configured`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
