export type { ConnectorPreviewData as JiraPreviewData, NormalisedBlocker, NormalisedTaskData } from "@/lib/connectors/types";

export interface JiraOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  cloudId: string;
  siteUrl?: string;
}

export interface JiraConnectorConfig {
  jiraProjectId: string;
  jiraProjectKey: string;
  jiraProjectName: string;
  boardId?: number;
  setupComplete: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  type: string;
  boardCount: number;
}
