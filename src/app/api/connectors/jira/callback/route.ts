import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/org/context";
import { can } from "@/lib/org/permissions";
import {
  assertProjectInOrganization,
  ensureJiraBinding,
  upsertOrgJiraIntegration,
} from "@/lib/db/connectors";
import {
  decodeOAuthState,
  exchangeJiraCodeForTokens,
  getAccessibleJiraResources,
  getJiraOAuthConfig,
} from "@/lib/connectors/jira/oauth";
import type { JiraOAuthCredentials } from "@/lib/connectors/jira/types";

export async function GET(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?jiraError=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?jiraError=missing_code", request.url));
  }

  let organizationId: string;
  let projectId: string | undefined;
  try {
    ({ organizationId, projectId } = decodeOAuthState(state));
    if (organizationId !== ctx.organizationId) {
      throw new Error("Organization mismatch");
    }
    if (!can(ctx.role, "integration.manage")) {
      return NextResponse.redirect(new URL("/settings?tab=tools&jiraError=forbidden", request.url));
    }
    if (projectId) {
      await assertProjectInOrganization(projectId, organizationId);
    }
  } catch {
    return NextResponse.redirect(new URL("/dashboard?jiraError=invalid_state", request.url));
  }

  const settingsRedirect = new URL("/settings?tab=tools", request.url);
  const projectRedirect = projectId
    ? new URL(`/projects/${projectId}?jiraSetup=true`, request.url)
    : settingsRedirect;

  try {
    getJiraOAuthConfig();
    const tokens = await exchangeJiraCodeForTokens(code);
    const resources = await getAccessibleJiraResources(tokens.access_token);
    const site = resources[0];

    if (!site) {
      projectRedirect.searchParams.set("jiraError", "no_sites");
      return NextResponse.redirect(projectRedirect);
    }

    const credentials: JiraOAuthCredentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      cloudId: site.id,
      siteUrl: site.url,
    };

    const integration = await upsertOrgJiraIntegration(organizationId, ctx.userId, credentials);
    if (projectId) {
      await ensureJiraBinding(projectId, integration.id);
    }

    return NextResponse.redirect(projectRedirect);
  } catch (callbackError) {
    console.error("Jira OAuth callback failed:", callbackError);
    projectRedirect.searchParams.set("jiraError", "callback_failed");
    return NextResponse.redirect(projectRedirect);
  }
}
