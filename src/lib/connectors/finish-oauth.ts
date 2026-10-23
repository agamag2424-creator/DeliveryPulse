import { NextResponse } from "next/server";

import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog";
import { exchangeAsanaCodeForTokens } from "@/lib/connectors/asana/oauth";
import { exchangeMondayCodeForTokens } from "@/lib/connectors/monday/oauth";
import { decodeOAuthState } from "@/lib/connectors/oauth-state";
import type { ConnectorType } from "@/lib/connectors/types";
import { connectorTypeToSlug } from "@/lib/connectors/types";
import {
  assertProjectInOrganization,
  ensureBinding,
  serializeCredentials,
  upsertOrgIntegration,
} from "@/lib/db/connectors";
import { can } from "@/lib/org/permissions";
import { getOrgContext } from "@/lib/org/context";

function setupPath(type: ConnectorType, projectId: string | undefined, requestUrl: string): URL {
  if (projectId) {
    return new URL(`/projects/${projectId}?setup=${connectorTypeToSlug(type)}`, requestUrl);
  }
  return new URL("/settings?tab=tools", requestUrl);
}

export async function finishOAuthCodeCallback(
  request: Request,
  type: Extract<ConnectorType, "ASANA" | "MONDAY">,
): Promise<NextResponse> {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const catalog = CONNECTOR_CATALOG[type];

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?connectorError=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?connectorError=missing_code", request.url));
  }

  let organizationId: string;
  let projectId: string | undefined;
  try {
    ({ organizationId, projectId } = decodeOAuthState(state));
    if (organizationId !== ctx.organizationId) {
      throw new Error("Organization mismatch");
    }
    if (!can(ctx.role, "integration.manage")) {
      return NextResponse.redirect(new URL("/settings?tab=tools&connectorError=forbidden", request.url));
    }
    if (projectId) {
      await assertProjectInOrganization(projectId, organizationId);
    }
  } catch {
    return NextResponse.redirect(new URL("/dashboard?connectorError=invalid_state", request.url));
  }

  const redirectTo = setupPath(type, projectId, request.url);

  try {
    const credentials =
      type === "ASANA" ? await exchangeAsanaCodeForTokens(code) : await exchangeMondayCodeForTokens(code);
    const integration = await upsertOrgIntegration(
      organizationId,
      type,
      ctx.userId,
      serializeCredentials(credentials),
    );
    if (projectId) {
      await ensureBinding(projectId, type, integration.id);
    }
    return NextResponse.redirect(redirectTo);
  } catch (callbackError) {
    console.error(`${catalog.label} OAuth callback failed:`, callbackError);
    redirectTo.searchParams.set("connectorError", "callback_failed");
    return NextResponse.redirect(redirectTo);
  }
}

export async function finishTrelloTokenCallback(
  request: Request,
  token: string,
  state: string,
): Promise<NextResponse> {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let organizationId: string;
  let projectId: string | undefined;
  try {
    ({ organizationId, projectId } = decodeOAuthState(state));
    if (organizationId !== ctx.organizationId) {
      throw new Error("Organization mismatch");
    }
    if (!can(ctx.role, "integration.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (projectId) {
      await assertProjectInOrganization(projectId, organizationId);
    }
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  try {
    const integration = await upsertOrgIntegration(
      organizationId,
      "TRELLO",
      ctx.userId,
      serializeCredentials({ token }),
    );
    if (projectId) {
      await ensureBinding(projectId, "TRELLO", integration.id);
    }
    const redirectTo = setupPath("TRELLO", projectId, request.url);
    return NextResponse.json({ redirectTo: `${redirectTo.pathname}${redirectTo.search}` });
  } catch (callbackError) {
    console.error("Trello token callback failed:", callbackError);
    return NextResponse.json({ error: "Callback failed" }, { status: 500 });
  }
}
