import { getConnectorById, parseCredentials } from "@/lib/db/connectors";
import { trelloAuthQuery, type TrelloOAuthCredentials } from "@/lib/connectors/trello/oauth";

export async function trelloJson<T>(connectorId: string, path: string): Promise<T> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const credentials = parseCredentials<TrelloOAuthCredentials>(connector.credentialsEnc);
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://api.trello.com/1${path}${separator}${trelloAuthQuery(credentials.token)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trello API failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<T>;
}
