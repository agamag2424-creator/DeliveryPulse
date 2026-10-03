import { isAsanaOAuthConfigured } from "@/lib/connectors/asana/oauth";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog-meta";
import { isJiraOAuthConfigured } from "@/lib/connectors/jira/oauth";
import { isMondayOAuthConfigured } from "@/lib/connectors/monday/oauth";
import { isTrelloOAuthConfigured } from "@/lib/connectors/trello/oauth";
import type { ConnectorType } from "@/lib/connectors/types";

export { CONNECTOR_CATALOG } from "@/lib/connectors/catalog-meta";
export type { ConnectorCatalogEntry } from "@/lib/connectors/catalog-meta";

export function isConnectorOAuthConfigured(type: ConnectorType): boolean {
  switch (type) {
    case "JIRA":
      return isJiraOAuthConfigured();
    case "ASANA":
      return isAsanaOAuthConfigured();
    case "MONDAY":
      return isMondayOAuthConfigured();
    case "TRELLO":
      return isTrelloOAuthConfigured();
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
