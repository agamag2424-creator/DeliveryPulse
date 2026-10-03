export interface MondayOAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: number;
}

export function isMondayOAuthConfigured(): boolean {
  const clientId = process.env.MONDAY_CLIENT_ID?.trim();
  const clientSecret = process.env.MONDAY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MONDAY_REDIRECT_URI?.trim();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function getMondayOAuthConfig() {
  const clientId = process.env.MONDAY_CLIENT_ID?.trim();
  const clientSecret = process.env.MONDAY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MONDAY_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Monday.com OAuth is not configured. Set MONDAY_CLIENT_ID, MONDAY_CLIENT_SECRET, and MONDAY_REDIRECT_URI in .env.local.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildMondayAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getMondayOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    force_install_if_needed: "true",
  });
  return `https://auth.monday.com/oauth2/authorize?${params.toString()}`;
}

interface MondayTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  account_id?: number;
}

export async function exchangeMondayCodeForTokens(code: string): Promise<MondayOAuthCredentials> {
  const { clientId, clientSecret, redirectUri } = getMondayOAuthConfig();
  const response = await fetch("https://auth.monday.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Monday token exchange failed: ${response.status} ${body}`);
  }

  const tokens = (await response.json()) as MondayTokenResponse;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accountId: tokens.account_id,
  };
}
