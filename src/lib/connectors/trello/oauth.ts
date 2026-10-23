export interface TrelloOAuthCredentials {
  token: string;
}

export function isTrelloOAuthConfigured(): boolean {
  return Boolean(process.env.TRELLO_API_KEY?.trim());
}

export function getTrelloOAuthConfig() {
  const apiKey = process.env.TRELLO_API_KEY?.trim();
  const redirectUri = process.env.TRELLO_REDIRECT_URI?.trim();

  if (!apiKey) {
    throw new Error("Trello is not configured. Set TRELLO_API_KEY in .env.local.");
  }

  return {
    apiKey,
    redirectUri: redirectUri || "",
  };
}

export function buildTrelloAuthorizeUrl(returnUrl: string): string {
  const { apiKey } = getTrelloOAuthConfig();
  const params = new URLSearchParams({
    expiration: "never",
    name: "Delivery Pulse",
    scope: "read",
    response_type: "token",
    key: apiKey,
    return_url: returnUrl,
    callback_method: "fragment",
  });
  return `https://trello.com/1/authorize?${params.toString()}`;
}

export function trelloAuthQuery(token: string): string {
  const { apiKey } = getTrelloOAuthConfig();
  return `key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(token)}`;
}
