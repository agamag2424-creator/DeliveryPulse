export const CONNECTOR_TYPES = ["JIRA", "ASANA", "MONDAY", "TRELLO"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export type ConnectorSlug = "jira" | "asana" | "monday" | "trello";

export interface NormalisedBlocker {
  summary: string;
  assignee: string;
  reason: string;
  issueKey: string;
}

export interface NormalisedTaskData {
  sprintName: string;
  sprintStartDate: string;
  sprintEndDate: string;
  tasksPlanned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  blockers: NormalisedBlocker[];
  recentCompletions: string[];
  teamMembers: string[];
  source: ConnectorType;
  fetchedAt: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface ConnectorPreviewData {
  tasksPlanned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksBlocked: number;
  blockerCount: number;
  teamMemberCount: number;
  sprintName: string;
}

export interface ExternalResource {
  id: string;
  key: string;
  name: string;
}

export interface ExternalConnectorConfig {
  externalId: string;
  externalKey: string;
  externalName: string;
  setupComplete: boolean;
}

export function isConnectorType(value: string): value is ConnectorType {
  return (CONNECTOR_TYPES as readonly string[]).includes(value);
}

export function slugToConnectorType(slug: string): ConnectorType | null {
  switch (slug.toLowerCase()) {
    case "jira":
      return "JIRA";
    case "asana":
      return "ASANA";
    case "monday":
      return "MONDAY";
    case "trello":
      return "TRELLO";
    default:
      return null;
  }
}

export function connectorTypeToSlug(type: ConnectorType): ConnectorSlug {
  switch (type) {
    case "JIRA":
      return "jira";
    case "ASANA":
      return "asana";
    case "MONDAY":
      return "monday";
    case "TRELLO":
      return "trello";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function parseExternalConfig(config: unknown): ExternalConnectorConfig {
  const raw = (config ?? {}) as Partial<ExternalConnectorConfig>;
  return {
    externalId: raw.externalId ?? "",
    externalKey: raw.externalKey ?? "",
    externalName: raw.externalName ?? "",
    setupComplete: raw.setupComplete ?? false,
  };
}

export function toPreviewData(data: NormalisedTaskData): ConnectorPreviewData {
  return {
    tasksPlanned: data.tasksPlanned,
    tasksCompleted: data.tasksCompleted,
    tasksInProgress: data.tasksInProgress,
    tasksBlocked: data.blockers.length,
    blockerCount: data.blockers.length,
    teamMemberCount: data.teamMembers.length,
    sprintName: data.sprintName,
  };
}

export function emptyNormalisedData(source: ConnectorType): NormalisedTaskData {
  return {
    sprintName: "",
    sprintStartDate: "",
    sprintEndDate: "",
    tasksPlanned: 0,
    tasksCompleted: 0,
    tasksInProgress: 0,
    blockers: [],
    recentCompletions: [],
    teamMembers: [],
    source,
    fetchedAt: new Date().toISOString(),
    confidence: "LOW",
  };
}
