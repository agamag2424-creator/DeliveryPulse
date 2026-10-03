import { getConnectorById, parseCredentials } from "@/lib/db/connectors";
import type { MondayOAuthCredentials } from "@/lib/connectors/monday/oauth";

interface MondayGraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function mondayGraphql<T>(connectorId: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const credentials = parseCredentials<MondayOAuthCredentials>(connector.credentialsEnc);
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      Authorization: credentials.accessToken,
      "Content-Type": "application/json",
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Monday API failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as MondayGraphqlResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  if (!payload.data) {
    throw new Error("Monday API returned no data");
  }
  return payload.data;
}
