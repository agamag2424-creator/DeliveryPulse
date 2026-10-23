import {
  getConnectorById,
  parseCredentials,
  serializeCredentials,
} from "@/lib/db/connectors";
import type { AsanaOAuthCredentials } from "@/lib/connectors/asana/oauth";
import { refreshAsanaAccessToken } from "@/lib/connectors/asana/oauth";
import { prisma } from "@/lib/prisma";

const EXPIRY_SKEW_MS = 60_000;

async function persistCredentials(connectorId: string, credentials: AsanaOAuthCredentials): Promise<void> {
  const binding = await prisma.projectConnectorBinding.findUnique({
    where: { id: connectorId },
    select: { integrationId: true },
  });
  if (!binding) {
    throw new Error("Connector not found");
  }
  await prisma.organizationIntegration.update({
    where: { id: binding.integrationId },
    data: { credentialsEnc: serializeCredentials(credentials), lastSyncError: null },
  });
}

export async function getValidAsanaCredentials(connectorId: string): Promise<AsanaOAuthCredentials> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const credentials = parseCredentials<AsanaOAuthCredentials>(connector.credentialsEnc);
  if (credentials.expiresAt - EXPIRY_SKEW_MS > Date.now()) {
    return credentials;
  }

  if (!credentials.refreshToken) {
    throw new Error("Asana token expired and no refresh token is stored");
  }

  const refreshed = await refreshAsanaAccessToken(credentials.refreshToken);
  await persistCredentials(connectorId, refreshed);
  return refreshed;
}

export async function asanaJson<T>(connectorId: string, path: string): Promise<T> {
  const credentials = await getValidAsanaCredentials(connectorId);
  const response = await fetch(`https://app.asana.com/api/1.0${path}`, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Asana API failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<T>;
}
