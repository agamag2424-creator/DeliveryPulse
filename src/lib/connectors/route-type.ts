import type { ConnectorType } from "@/lib/connectors/types";
import { slugToConnectorType } from "@/lib/connectors/types";

export function parseManagedConnectorType(slug: string | undefined): Extract<ConnectorType, "ASANA" | "MONDAY" | "TRELLO"> | null {
  if (!slug) {
    return null;
  }
  const type = slugToConnectorType(slug);
  if (type === "ASANA" || type === "MONDAY" || type === "TRELLO") {
    return type;
  }
  return null;
}
