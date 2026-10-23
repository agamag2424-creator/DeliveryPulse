export function isJiraOAuthConfigured(): boolean {
  const clientId = process.env.JIRA_CLIENT_ID?.trim();
  const clientSecret = process.env.JIRA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.JIRA_REDIRECT_URI?.trim();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function getJiraOAuthConfig() {
  const clientId = process.env.JIRA_CLIENT_ID?.trim();
  const clientSecret = process.env.JIRA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.JIRA_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Jira OAuth is not configured. Set JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, and JIRA_REDIRECT_URI in .env.local.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export const JIRA_OAUTH_SCOPES = ["read:jira-work", "read:jira-user", "offline_access"];

export function buildJiraAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getJiraOAuthConfig();
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: clientId,
    scope: JIRA_OAUTH_SCOPES.join(" "),
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  });

  return `https://auth.atlassian.com/authorize?${params.toString()}`;
}

export interface AtlassianTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeJiraCodeForTokens(code: string): Promise<AtlassianTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getJiraOAuthConfig();

  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira token exchange failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<AtlassianTokenResponse>;
}

export async function refreshJiraAccessToken(refreshToken: string): Promise<AtlassianTokenResponse> {
  const { clientId, clientSecret } = getJiraOAuthConfig();

  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jira token refresh failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<AtlassianTokenResponse>;
}

export interface AtlassianAccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl?: string;
}

export async function getAccessibleJiraResources(accessToken: string): Promise<AtlassianAccessibleResource[]> {
  const response = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch Jira resources: ${response.status} ${body}`);
  }

  return response.json() as Promise<AtlassianAccessibleResource[]>;
}

export { decodeOAuthState, encodeOAuthState } from "@/lib/connectors/oauth-state";
