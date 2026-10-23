import { jiraJson } from "@/lib/connectors/jira/client";
import type { JiraProject } from "@/lib/connectors/jira/types";

interface JiraProjectSearchResponse {
  values: Array<{
    id: string;
    key: string;
    name: string;
    projectTypeKey: string;
  }>;
}

interface JiraBoardListResponse {
  values: Array<{ id: number }>;
}

async function getBoardCount(connectorId: string, projectKey: string): Promise<number> {
  try {
    const data = await jiraJson<JiraBoardListResponse>(
      connectorId,
      `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&maxResults=50`,
    );
    return data.values.length;
  } catch {
    return 0;
  }
}

export async function discoverJiraProjects(connectorId: string): Promise<JiraProject[]> {
  const data = await jiraJson<JiraProjectSearchResponse>(
    connectorId,
    "/rest/api/3/project/search?maxResults=50&orderBy=name",
  );

  const projects = await Promise.all(
    data.values.map(async (project) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      type: project.projectTypeKey,
      boardCount: await getBoardCount(connectorId, project.key),
    })),
  );

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveBoardForProject(
  connectorId: string,
  jiraProjectKey: string,
): Promise<number | undefined> {
  try {
    const data = await jiraJson<JiraBoardListResponse>(
      connectorId,
      `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(jiraProjectKey)}&maxResults=1`,
    );
    return data.values[0]?.id;
  } catch {
    return undefined;
  }
}
