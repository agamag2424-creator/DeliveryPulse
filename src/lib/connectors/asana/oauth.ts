export interface AsanaOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function isAsanaOAuthConfigured(): boolean {
  const clientId = process.env.ASANA_CLIENT_ID?.trim();
  const clientSecret = process.env.ASANA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.ASANA_REDIRECT_URI?.trim();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function getAsanaOAuthConfig() {
  const clientId = process.env.ASANA_CLIENT_ID?.trim();
  const clientSecret = process.env.ASANA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.ASANA_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Asana OAuth is not configured. Set ASANA_CLIENT_ID, ASANA_CLIENT_SECRET, and ASANA_REDIRECT_URI in .env.local.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export const ASANA_OAUTH_SCOPES = ["default"];

export function buildAsanaAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getAsanaOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: ASANA_OAUTH_SCOPES.join(" "),
  });
  return `https://app.asana.com/-/oauth_authorize?${params.toString()}`;
}

interface AsanaTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

async function asanaTokenRequest(body: URLSearchParams): Promise<AsanaTokenResponse> {
  const response = await fetch("https://app.asana.com/-/oauth_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Asana token request failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<AsanaTokenResponse>;
}

export async function exchangeAsanaCodeForTokens(code: string): Promise<AsanaOAuthCredentials> {
  const { clientId, clientSecret, redirectUri } = getAsanaOAuthConfig();
  const tokens = await asanaTokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  );

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? "",
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
  };
}

export async function refreshAsanaAccessToken(refreshToken: string): Promise<AsanaOAuthCredentials> {
  const { clientId, clientSecret, redirectUri } = getAsanaOAuthConfig();
  const tokens = await asanaTokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      refresh_token: refreshToken,
    }),
  );

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
  };
}
