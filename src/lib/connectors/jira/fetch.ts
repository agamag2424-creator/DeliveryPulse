import {
  getJiraConnectorById,
  parseJiraConfig,
} from "@/lib/db/connectors";
import { jiraJson } from "@/lib/connectors/jira/client";
import type { JiraPreviewData, NormalisedBlocker, NormalisedTaskData } from "@/lib/connectors/jira/types";

interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

interface JiraSprintListResponse {
  values: JiraSprint[];
}

interface JiraIssueFields {
  summary: string;
  status?: { name: string; statusCategory?: { key: string } };
  assignee?: { displayName?: string } | null;
}

interface JiraIssue {
  key: string;
  fields: JiraIssueFields;
}

interface JiraSprintIssuesResponse {
  issues: JiraIssue[];
}

interface JiraSearchResponse {
  issues: JiraIssue[];
}

interface JiraCommentListResponse {
  comments: Array<{ body?: unknown }>;
}

function extractCommentText(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  if (body && typeof body === "object" && "content" in body) {
    const content = (body as { content?: Array<{ text?: string; content?: unknown[] }> }).content ?? [];
    return content
      .flatMap((node) => {
        if (node.text) {
          return [node.text];
        }
        if (node.content) {
          return node.content
            .map((child) => (typeof child === "object" && child && "text" in child ? String(child.text ?? "") : ""))
            .filter(Boolean);
        }
        return [];
      })
      .join(" ")
      .trim();
  }

  return "";
}

function isDone(issue: JiraIssue): boolean {
  return issue.fields.status?.statusCategory?.key === "done";
}

function isInProgress(issue: JiraIssue): boolean {
  const category = issue.fields.status?.statusCategory?.key;
  return category === "indeterminate" || category === "new";
}

function isBlocked(issue: JiraIssue): boolean {
  const statusName = issue.fields.status?.name?.toLowerCase() ?? "";
  return statusName.includes("block");
}

async function getLatestComment(connectorId: string, issueKey: string): Promise<string> {
  try {
    const data = await jiraJson<JiraCommentListResponse>(
      connectorId,
      `/rest/api/3/issue/${issueKey}/comment?maxResults=1&orderBy=-created`,
    );
    const comment = data.comments[0];
    return comment ? extractCommentText(comment.body) : "";
  } catch {
    return "";
  }
}

async function getActiveOrRecentSprint(
  connectorId: string,
  boardId: number,
): Promise<JiraSprint | null> {
  const active = await jiraJson<JiraSprintListResponse>(
    connectorId,
    `/rest/agile/1.0/board/${boardId}/sprint?state=active`,
  );
  if (active.values[0]) {
    return active.values[0];
  }

  const closed = await jiraJson<JiraSprintListResponse>(
    connectorId,
    `/rest/agile/1.0/board/${boardId}/sprint?state=closed&maxResults=1`,
  );
  return closed.values[0] ?? null;
}

async function getSprintIssues(connectorId: string, sprintId: number): Promise<JiraIssue[]> {
  const data = await jiraJson<JiraSprintIssuesResponse>(
    connectorId,
    `/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=100`,
  );
  return data.issues;
}

async function getRecentCompletions(connectorId: string, projectKey: string): Promise<string[]> {
  const jql = encodeURIComponent(
    `project = "${projectKey}" AND statusCategory = Done AND updated >= -7d ORDER BY updated DESC`,
  );

  try {
    const data = await jiraJson<JiraSearchResponse>(
      connectorId,
      `/rest/api/3/search?jql=${jql}&maxResults=20&fields=summary`,
    );
    return data.issues.map((issue) => `${issue.key}: ${issue.fields.summary}`);
  } catch {
    return [];
  }
}

function computeConfidence(sprint: JiraSprint | null): NormalisedTaskData["confidence"] {
  if (!sprint) {
    return "LOW";
  }

  if (sprint.state === "active") {
    return "HIGH";
  }

  const endDate = sprint.endDate ?? sprint.completeDate;
  if (!endDate) {
    return "MEDIUM";
  }

  const daysSinceEnd = (Date.now() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceEnd > 2 ? "MEDIUM" : "HIGH";
}

async function buildNormalisedData(
  connectorId: string,
  jiraProjectKey: string,
  boardId: number | undefined,
): Promise<NormalisedTaskData> {
  let sprint: JiraSprint | null = null;
  let issues: JiraIssue[] = [];

  if (boardId) {
    sprint = await getActiveOrRecentSprint(connectorId, boardId);
    if (sprint) {
      issues = await getSprintIssues(connectorId, sprint.id);
    }
  }

  const blockedIssues = issues.filter(isBlocked);
  const blockers: NormalisedBlocker[] = await Promise.all(
    blockedIssues.slice(0, 10).map(async (issue) => ({
      issueKey: issue.key,
      summary: issue.fields.summary,
      assignee: issue.fields.assignee?.displayName ?? "Unassigned",
      reason: (await getLatestComment(connectorId, issue.key)) || "No comment provided",
    })),
  );

  const teamMembers = [
    ...new Set(
      issues
        .map((issue) => issue.fields.assignee?.displayName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  const recentCompletions = await getRecentCompletions(connectorId, jiraProjectKey);

  return {
    sprintName: sprint?.name ?? "No sprint found",
    sprintStartDate: sprint?.startDate ?? "",
    sprintEndDate: sprint?.endDate ?? sprint?.completeDate ?? "",
    tasksPlanned: issues.length,
    tasksCompleted: issues.filter(isDone).length,
    tasksInProgress: issues.filter(isInProgress).length,
    blockers,
    recentCompletions,
    teamMembers,
    source: "JIRA",
    fetchedAt: new Date().toISOString(),
    confidence: computeConfidence(sprint),
  };
}

export function toPreviewData(data: NormalisedTaskData): JiraPreviewData {
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

export async function fetchJiraProjectData(
  connectorId: string,
  _projectId: string,
): Promise<NormalisedTaskData> {
  const connector = await getJiraConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const config = parseJiraConfig(connector.config);
  if (!config.jiraProjectKey) {
    throw new Error("Jira project is not configured for this connector");
  }

  return buildNormalisedData(connectorId, config.jiraProjectKey, config.boardId);
}

export async function fetchJiraPreviewData(connectorId: string): Promise<JiraPreviewData> {
  const data = await fetchJiraProjectData(connectorId, "");
  return toPreviewData(data);
}
