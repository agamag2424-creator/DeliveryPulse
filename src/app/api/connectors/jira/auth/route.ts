import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { can } from "@/lib/org/permissions";
import { getOrgContext } from "@/lib/org/context";
import {
  assertProjectInOrganization,
  ensureJiraBinding,
  JIRA_CONNECTOR_TYPE,
} from "@/lib/db/connectors";
import {
  buildJiraAuthorizeUrl,
  encodeOAuthState,
  isJiraOAuthConfigured,
} from "@/lib/connectors/jira/oauth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const reconnect = searchParams.get("reconnect") === "true";

  if (projectId) {
    try {
      await assertProjectInOrganization(projectId, ctx.organizationId);
    } catch {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const integration = await prisma.organizationIntegration.findUnique({
    where: {
      organizationId_type: { organizationId: ctx.organizationId, type: JIRA_CONNECTOR_TYPE },
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
    await ensureJiraBinding(projectId, integration.id);
    return NextResponse.redirect(new URL(`/projects/${projectId}?jiraSetup=true`, request.url));
  }

  if (!isJiraOAuthConfigured()) {
    const fallback = projectId
      ? `/projects/${projectId}?jiraSetup=true&jiraUnavailable=local`
      : "/settings?tab=tools&jiraUnavailable=local";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  try {
    const state = encodeOAuthState({
      organizationId: ctx.organizationId,
      projectId: projectId ?? undefined,
      nonce: randomBytes(16).toString("hex"),
    });
    const authorizeUrl = buildJiraAuthorizeUrl(state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Jira auth initiation failed:", error);
    const message = error instanceof Error ? error.message : "Jira OAuth is not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
