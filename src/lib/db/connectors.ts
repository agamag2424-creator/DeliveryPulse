import { Prisma } from "@prisma/client";

import type { ExternalConnectorConfig } from "@/lib/connectors/types";
import type { JiraConnectorConfig, JiraOAuthCredentials } from "@/lib/connectors/jira/types";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const JIRA_CONNECTOR_TYPE = "JIRA";
export const ASANA_CONNECTOR_TYPE = "ASANA";
export const MONDAY_CONNECTOR_TYPE = "MONDAY";
export const TRELLO_CONNECTOR_TYPE = "TRELLO";

export type ConnectorStatus = "PENDING" | "ACTIVE" | "DISCONNECTED";

/** Project-scoped connector view. Credentials come from the org integration. */
export type Connector = {
  id: string;
  projectId: string;
  type: string;
  status: string;
  credentialsEnc: string;
  config: Prisma.JsonValue;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
  integrationId: string;
};

function toConnectorView(
  binding: {
    id: string;
    projectId: string;
    type: string;
    status: string;
    config: Prisma.JsonValue;
    lastSyncedAt: Date | null;
    lastSyncStatus: string | null;
    lastSyncError: string | null;
    createdAt: Date;
    updatedAt: Date;
    integrationId: string;
    integration: { credentialsEnc: string; status: string };
  },
): Connector {
  const status =
    binding.integration.status === "DISCONNECTED" ? "DISCONNECTED" : binding.status;
  return {
    id: binding.id,
    projectId: binding.projectId,
    type: binding.type,
    status,
    credentialsEnc: binding.integration.credentialsEnc,
    config: binding.config,
    lastSyncedAt: binding.lastSyncedAt,
    lastSyncStatus: binding.lastSyncStatus,
    lastSyncError: binding.lastSyncError,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
    integrationId: binding.integrationId,
  };
}

export function serializeCredentials(credentials: object): string {
  return encrypt(JSON.stringify(credentials));
}

export function parseCredentials<T>(credentialsEnc: string): T {
  return JSON.parse(decrypt(credentialsEnc)) as T;
}

export function parseJiraCredentials(credentialsEnc: string): JiraOAuthCredentials {
  return parseCredentials<JiraOAuthCredentials>(credentialsEnc);
}

export function serializeJiraCredentials(credentials: JiraOAuthCredentials): string {
  return serializeCredentials(credentials);
}

export function parseJiraConfig(config: unknown): JiraConnectorConfig {
  const raw = config as Partial<JiraConnectorConfig>;
  return {
    jiraProjectId: raw.jiraProjectId ?? "",
    jiraProjectKey: raw.jiraProjectKey ?? "",
    jiraProjectName: raw.jiraProjectName ?? "",
    boardId: raw.boardId,
    setupComplete: raw.setupComplete ?? false,
  };
}

function emptyExternalConfig(): ExternalConnectorConfig {
  return {
    externalId: "",
    externalKey: "",
    externalName: "",
    setupComplete: false,
  };
}

function defaultConfigForType(type: string): Prisma.InputJsonValue {
  if (type === JIRA_CONNECTOR_TYPE) {
    return {
      jiraProjectId: "",
      jiraProjectKey: "",
      jiraProjectName: "",
      setupComplete: false,
    };
  }
  return emptyExternalConfig() as unknown as Prisma.InputJsonValue;
}

export async function getConnectorForProject(projectId: string, type: string): Promise<Connector | null> {
  const binding = await prisma.projectConnectorBinding.findUnique({
    where: { projectId_type: { projectId, type } },
    include: { integration: true },
  });
  return binding ? toConnectorView(binding) : null;
}

export async function getJiraConnectorForProject(projectId: string): Promise<Connector | null> {
  return getConnectorForProject(projectId, JIRA_CONNECTOR_TYPE);
}

export async function getConnectorById(connectorId: string): Promise<Connector | null> {
  const binding = await prisma.projectConnectorBinding.findFirst({
    where: { id: connectorId },
    include: { integration: true },
  });
  return binding ? toConnectorView(binding) : null;
}

export async function getJiraConnectorById(connectorId: string): Promise<Connector | null> {
  const binding = await prisma.projectConnectorBinding.findFirst({
    where: { id: connectorId, type: JIRA_CONNECTOR_TYPE },
    include: { integration: true },
  });
  return binding ? toConnectorView(binding) : null;
}

export async function getActiveConnectorsForProject(projectId: string): Promise<Connector[]> {
  const bindings = await prisma.projectConnectorBinding.findMany({
    where: { projectId, status: "ACTIVE" },
    include: { integration: true },
  });
  return bindings
    .map(toConnectorView)
    .filter((connector) => connector.status === "ACTIVE");
}

export async function upsertOrgIntegration(
  organizationId: string,
  type: string,
  connectedByUserId: string,
  credentialsEnc: string,
): Promise<{ id: string }> {
  const existing = await prisma.organizationIntegration.findUnique({
    where: { organizationId_type: { organizationId, type } },
  });

  if (existing) {
    return prisma.organizationIntegration.update({
      where: { id: existing.id },
      data: {
        credentialsEnc,
        status: "ACTIVE",
        connectedByUserId,
        lastSyncError: null,
      },
      select: { id: true },
    });
  }

  return prisma.organizationIntegration.create({
    data: {
      organizationId,
      type,
      status: "ACTIVE",
      credentialsEnc,
      connectedByUserId,
    },
    select: { id: true },
  });
}

export async function upsertOrgJiraIntegration(
  organizationId: string,
  connectedByUserId: string,
  credentials: JiraOAuthCredentials,
): Promise<{ id: string }> {
  return upsertOrgIntegration(
    organizationId,
    JIRA_CONNECTOR_TYPE,
    connectedByUserId,
    serializeJiraCredentials(credentials),
  );
}

export async function ensureBinding(
  projectId: string,
  type: string,
  integrationId: string,
): Promise<Connector> {
  const existing = await prisma.projectConnectorBinding.findUnique({
    where: { projectId_type: { projectId, type } },
    include: { integration: true },
  });

  if (existing) {
    const updated = await prisma.projectConnectorBinding.update({
      where: { id: existing.id },
      data: { integrationId, type },
      include: { integration: true },
    });
    return toConnectorView(updated);
  }

  const created = await prisma.projectConnectorBinding.create({
    data: {
      projectId,
      integrationId,
      type,
      status: "PENDING",
      config: defaultConfigForType(type),
    },
    include: { integration: true },
  });
  return toConnectorView(created);
}

export async function ensureJiraBinding(projectId: string, integrationId: string): Promise<Connector> {
  return ensureBinding(projectId, JIRA_CONNECTOR_TYPE, integrationId);
}

export async function upsertJiraConnector(
  projectId: string,
  organizationId: string,
  connectedByUserId: string,
  credentials: JiraOAuthCredentials,
  config: Partial<JiraConnectorConfig> = {},
): Promise<Connector> {
  const integration = await upsertOrgJiraIntegration(organizationId, connectedByUserId, credentials);
  const binding = await ensureJiraBinding(projectId, integration.id);

  if (Object.keys(config).length === 0) {
    return binding;
  }

  return updateJiraConnectorConfig(binding.id, config);
}

export async function updateJiraCredentials(
  connectorId: string,
  credentials: JiraOAuthCredentials,
): Promise<void> {
  const binding = await prisma.projectConnectorBinding.findUnique({
    where: { id: connectorId },
    select: { integrationId: true },
  });
  if (!binding) {
    throw new Error("Connector not found");
  }
  await prisma.organizationIntegration.update({
    where: { id: binding.integrationId },
    data: { credentialsEnc: serializeJiraCredentials(credentials), lastSyncError: null },
  });
}

export async function updateJiraConnectorConfig(
  connectorId: string,
  config: Partial<JiraConnectorConfig>,
): Promise<Connector> {
  const connector = await getJiraConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const merged = { ...parseJiraConfig(connector.config), ...config };
  const updated = await prisma.projectConnectorBinding.update({
    where: { id: connectorId },
    data: {
      config: merged as unknown as Prisma.InputJsonValue,
      status: merged.setupComplete ? "ACTIVE" : "PENDING",
    },
    include: { integration: true },
  });
  return toConnectorView(updated);
}

export async function updateExternalConnectorConfig(
  connectorId: string,
  config: Partial<ExternalConnectorConfig>,
): Promise<Connector> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const current = (connector.config ?? {}) as Partial<ExternalConnectorConfig>;
  const merged: ExternalConnectorConfig = {
    externalId: config.externalId ?? current.externalId ?? "",
    externalKey: config.externalKey ?? current.externalKey ?? "",
    externalName: config.externalName ?? current.externalName ?? "",
    setupComplete: config.setupComplete ?? current.setupComplete ?? false,
  };

  const updated = await prisma.projectConnectorBinding.update({
    where: { id: connectorId },
    data: {
      config: merged as unknown as Prisma.InputJsonValue,
      status: merged.setupComplete ? "ACTIVE" : "PENDING",
    },
    include: { integration: true },
  });
  return toConnectorView(updated);
}

export async function setConnectorStatus(connectorId: string, status: ConnectorStatus): Promise<void> {
  const binding = await prisma.projectConnectorBinding.findUnique({
    where: { id: connectorId },
    select: { integrationId: true },
  });
  if (!binding) {
    return;
  }

  if (status === "DISCONNECTED") {
    await prisma.organizationIntegration.update({
      where: { id: binding.integrationId },
      data: { status: "DISCONNECTED" },
    });
    return;
  }

  await prisma.projectConnectorBinding.update({
    where: { id: connectorId },
    data: { status },
  });
}

export async function confirmConnector(connectorId: string): Promise<Connector> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  if (connector.type === JIRA_CONNECTOR_TYPE) {
    return confirmJiraConnector(connectorId);
  }

  return updateExternalConnectorConfig(connectorId, { setupComplete: true });
}

export async function confirmJiraConnector(connectorId: string): Promise<Connector> {
  const connector = await getJiraConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const config = { ...parseJiraConfig(connector.config), setupComplete: true };
  const updated = await prisma.projectConnectorBinding.update({
    where: { id: connectorId },
    data: {
      config: config as unknown as Prisma.InputJsonValue,
      status: "ACTIVE",
      lastSyncError: null,
    },
    include: { integration: true },
  });
  return toConnectorView(updated);
}

export async function disconnectOrgIntegration(
  organizationId: string,
  integrationId: string,
): Promise<boolean> {
  const result = await prisma.organizationIntegration.deleteMany({
    where: { id: integrationId, organizationId },
  });
  return result.count > 0;
}

export async function assertProjectInOrganization(
  projectId: string,
  organizationId: string,
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
  });
  if (!project) {
    throw new Error("Project not found");
  }
}

export function mappedResourceName(type: string, config: unknown): string | null {
  if (type === JIRA_CONNECTOR_TYPE) {
    const name = parseJiraConfig(config).jiraProjectName;
    return name || null;
  }
  const name = (config as Partial<ExternalConnectorConfig> | null)?.externalName;
  return name || null;
}
