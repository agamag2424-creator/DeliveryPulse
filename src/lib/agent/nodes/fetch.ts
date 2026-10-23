import { getActiveConnectorsForProject } from "@/lib/db/connectors";
import { fetchConnectorProjectData } from "@/lib/connectors/runtime";
import { embedJiraSyncData } from "@/lib/jobs/embedJiraSync";

import type { AgentState } from "../types";

const CONNECTOR_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Connector timeout")), ms);
    }),
  ]);
}

export async function fetchNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const connectors = await getActiveConnectorsForProject(state.projectId);
    if (connectors.length === 0) {
      return { connectors, connectorData: null };
    }

    const results = await Promise.allSettled(
      connectors.map((connector) =>
        withTimeout(fetchConnectorProjectData(connector, state.projectId), CONNECTOR_TIMEOUT_MS),
      ),
    );

    const firstSuccess = results.find((result) => result.status === "fulfilled");
    const connectorData = firstSuccess?.status === "fulfilled" ? firstSuccess.value : null;

    if (connectorData) {
      void embedJiraSyncData(state.projectId, state.userId, connectorData).catch((error) => {
        console.error("Background embedJiraSyncData failed:", error);
      });
    }

    return { connectors, connectorData };
  } catch (error) {
    console.error("Agent fetch node failed:", error);
    return { connectorData: null, error: null };
  }
}
