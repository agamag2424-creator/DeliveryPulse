import { getValidJiraCredentials, refreshJiraTokens } from "@/lib/connectors/jira/refresh";

export class JiraApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

function buildJiraUrl(cloudId: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `https://api.atlassian.com/ex/jira/${cloudId}${normalized}`;
}

export async function jiraFetch(
  connectorId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const credentials = await getValidJiraCredentials(connectorId);
  if (!credentials) {
    throw new JiraApiError("Jira connector is disconnected", 401);
  }

  const url = buildJiraUrl(credentials.cloudId, path);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${credentials.accessToken}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshed = await refreshJiraTokens(connectorId);
    if (!refreshed) {
      throw new JiraApiError("Jira connector is disconnected", 401);
    }

    const retryCredentials = await getValidJiraCredentials(connectorId);
    if (!retryCredentials) {
      throw new JiraApiError("Jira connector is disconnected", 401);
    }

    headers.set("Authorization", `Bearer ${retryCredentials.accessToken}`);
    response = await fetch(url, { ...init, headers });
  }

  return response;
}

export async function jiraJson<T>(connectorId: string, path: string, init?: RequestInit): Promise<T> {
  const response = await jiraFetch(connectorId, path, init);
  if (!response.ok) {
    const body = await response.text();
    throw new JiraApiError(`Jira API error: ${response.status}`, response.status, body);
  }

  return response.json() as Promise<T>;
}
