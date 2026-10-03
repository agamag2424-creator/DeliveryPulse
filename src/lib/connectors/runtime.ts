import { fetchAsanaPreviewData, fetchAsanaProjectData } from "@/lib/connectors/asana/fetch";
import { discoverAsanaProjects } from "@/lib/connectors/asana/discover";
import { fetchJiraPreviewData, fetchJiraProjectData } from "@/lib/connectors/jira/fetch";
import { discoverJiraProjects } from "@/lib/connectors/jira/discover";
import { fetchMondayBoardData, fetchMondayPreviewData } from "@/lib/connectors/monday/fetch";
import { discoverMondayBoards } from "@/lib/connectors/monday/discover";
import { fetchTrelloBoardData, fetchTrelloPreviewData } from "@/lib/connectors/trello/fetch";
import { discoverTrelloBoards } from "@/lib/connectors/trello/discover";
import type { Connector } from "@/lib/db/connectors";
import type { ConnectorPreviewData, ConnectorType, ExternalResource, NormalisedTaskData } from "@/lib/connectors/types";
import { isConnectorType } from "@/lib/connectors/types";

export async function listConnectorResources(connector: Connector): Promise<ExternalResource[]> {
  if (!isConnectorType(connector.type)) {
    return [];
  }

  switch (connector.type) {
    case "JIRA": {
      const projects = await discoverJiraProjects(connector.id);
      return projects.map((project) => ({ id: project.id, key: project.key, name: project.name }));
    }
    case "ASANA":
      return discoverAsanaProjects(connector.id);
    case "MONDAY":
      return discoverMondayBoards(connector.id);
    case "TRELLO":
      return discoverTrelloBoards(connector.id);
    default: {
      const exhaustive: never = connector.type;
      return exhaustive;
    }
  }
}

export async function fetchConnectorProjectData(connector: Connector, projectId: string): Promise<NormalisedTaskData> {
  if (!isConnectorType(connector.type)) {
    throw new Error(`Unsupported connector type: ${connector.type}`);
  }

  switch (connector.type) {
    case "JIRA":
      return fetchJiraProjectData(connector.id, projectId);
    case "ASANA":
      return fetchAsanaProjectData(connector.id);
    case "MONDAY":
      return fetchMondayBoardData(connector.id);
    case "TRELLO":
      return fetchTrelloBoardData(connector.id);
    default: {
      const exhaustive: never = connector.type;
      return exhaustive;
    }
  }
}

export async function fetchConnectorPreview(connector: Connector): Promise<ConnectorPreviewData> {
  if (!isConnectorType(connector.type)) {
    throw new Error(`Unsupported connector type: ${connector.type}`);
  }

  switch (connector.type) {
    case "JIRA":
      return fetchJiraPreviewData(connector.id);
    case "ASANA":
      return fetchAsanaPreviewData(connector.id);
    case "MONDAY":
      return fetchMondayPreviewData(connector.id);
    case "TRELLO":
      return fetchTrelloPreviewData(connector.id);
    default: {
      const exhaustive: never = connector.type;
      return exhaustive;
    }
  }
}

export function asConnectorType(type: string): ConnectorType {
  if (!isConnectorType(type)) {
    throw new Error(`Unsupported connector type: ${type}`);
  }
  return type;
}
