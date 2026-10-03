import {
  getJiraConnectorById,
  parseJiraCredentials,
  setConnectorStatus,
  updateJiraCredentials,
} from "@/lib/db/connectors";
import { refreshJiraAccessToken } from "@/lib/connectors/jira/oauth";
import type { JiraOAuthCredentials } from "@/lib/connectors/jira/types";

export async function refreshJiraTokens(connectorId: string): Promise<boolean> {
  const connector = await getJiraConnectorById(connectorId);
  if (!connector) {
    return false;
  }

  let credentials: JiraOAuthCredentials;
  try {
    credentials = parseJiraCredentials(connector.credentialsEnc);
  } catch {
    await setConnectorStatus(connectorId, "DISCONNECTED");
    return false;
  }

  if (!credentials.refreshToken) {
    await setConnectorStatus(connectorId, "DISCONNECTED");
    return false;
  }

  try {
    const tokens = await refreshJiraAccessToken(credentials.refreshToken);
    const updated: JiraOAuthCredentials = {
      ...credentials,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? credentials.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    await updateJiraCredentials(connectorId, updated);
    return true;
  } catch (error) {
    console.error("Jira token refresh failed:", error);
    await setConnectorStatus(connectorId, "DISCONNECTED");
    return false;
  }
}

export async function getValidJiraCredentials(connectorId: string): Promise<JiraOAuthCredentials | null> {
  const connector = await getJiraConnectorById(connectorId);
  if (!connector || connector.status === "DISCONNECTED") {
    return null;
  }

  let credentials: JiraOAuthCredentials;
  try {
    credentials = parseJiraCredentials(connector.credentialsEnc);
  } catch {
    await setConnectorStatus(connectorId, "DISCONNECTED");
    return null;
  }

  const expiresSoon = credentials.expiresAt <= Date.now() + 60_000;
  if (!expiresSoon) {
    return credentials;
  }

  const refreshed = await refreshJiraTokens(connectorId);
  if (!refreshed) {
    return null;
  }

  const updated = await getJiraConnectorById(connectorId);
  if (!updated) {
    return null;
  }

  return parseJiraCredentials(updated.credentialsEnc);
}
