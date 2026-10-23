import type { ConnectorSlug, ConnectorType } from "@/lib/connectors/types";

export type ConnectorCatalogEntry = {
  type: ConnectorType;
  slug: ConnectorSlug;
  label: string;
  resourceLabel: string;
  description: string;
};

export const CONNECTOR_CATALOG: Record<ConnectorType, ConnectorCatalogEntry> = {
  JIRA: {
    type: "JIRA",
    slug: "jira",
    label: "Jira",
    resourceLabel: "Jira project",
    description: "Pull sprint tasks, blockers, and team activity into report generation.",
  },
  ASANA: {
    type: "ASANA",
    slug: "asana",
    label: "Asana",
    resourceLabel: "Asana project",
    description: "Pull tasks, sections, and assignees from an Asana project.",
  },
  MONDAY: {
    type: "MONDAY",
    slug: "monday",
    label: "Monday.com",
    resourceLabel: "Monday board",
    description: "Pull board items, status, and owners from Monday.com.",
  },
  TRELLO: {
    type: "TRELLO",
    slug: "trello",
    label: "Trello",
    resourceLabel: "Trello board",
    description: "Pull cards, lists, and members from a Trello board.",
  },
};
