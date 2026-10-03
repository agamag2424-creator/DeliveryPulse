import { asanaJson } from "@/lib/connectors/asana/client";
import { getConnectorById, parseCredentials } from "@/lib/db/connectors";
import type { ExternalConnectorConfig, NormalisedBlocker, NormalisedTaskData } from "@/lib/connectors/types";
import { emptyNormalisedData, parseExternalConfig, toPreviewData } from "@/lib/connectors/types";

interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  completed_at?: string | null;
  assignee?: { name?: string } | null;
  due_on?: string | null;
  modified_at?: string | null;
  tags?: Array<{ name?: string }>;
  memberships?: Array<{ section?: { name?: string } | null }>;
}

interface AsanaProjectDetail {
  gid: string;
  name: string;
  start_on?: string | null;
  due_on?: string | null;
}

interface AsanaListResponse<T> {
  data: T[];
  next_page?: { offset: string } | null;
}

interface AsanaSingleResponse<T> {
  data: T;
}

function isBlocked(task: AsanaTask): boolean {
  const tagHit = (task.tags ?? []).some((tag) => (tag.name ?? "").toLowerCase().includes("block"));
  const nameHit = task.name.toLowerCase().includes("blocked");
  const sectionHit = (task.memberships ?? []).some((membership) =>
    (membership.section?.name ?? "").toLowerCase().includes("block"),
  );
  return tagHit || nameHit || sectionHit;
}

function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

async function listProjectTasks(connectorId: string, projectGid: string): Promise<AsanaTask[]> {
  const tasks: AsanaTask[] = [];
  let offset: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const query = new URLSearchParams({
      opt_fields: "name,completed,completed_at,assignee.name,due_on,tags.name,memberships.section.name,modified_at",
      limit: "100",
    });
    if (offset) {
      query.set("offset", offset);
    }

    const payload = await asanaJson<AsanaListResponse<AsanaTask>>(
      connectorId,
      `/projects/${projectGid}/tasks?${query.toString()}`,
    );
    tasks.push(...payload.data);
    offset = payload.next_page?.offset;
    if (!offset) {
      break;
    }
  }

  return tasks;
}

export async function fetchAsanaProjectData(connectorId: string): Promise<NormalisedTaskData> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  parseCredentials(connector.credentialsEnc);
  const config: ExternalConnectorConfig = parseExternalConfig(connector.config);
  if (!config.externalId) {
    throw new Error("Asana project is not mapped for this connector");
  }

  const project = (
    await asanaJson<AsanaSingleResponse<AsanaProjectDetail>>(
      connectorId,
      `/projects/${config.externalId}?opt_fields=name,start_on,due_on`,
    )
  ).data;
  const tasks = await listProjectTasks(connectorId, config.externalId);

  const incomplete = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  const blockedTasks = incomplete.filter(isBlocked);

  const blockers: NormalisedBlocker[] = blockedTasks.slice(0, 10).map((task) => ({
    issueKey: task.gid,
    summary: task.name,
    assignee: task.assignee?.name ?? "Unassigned",
    reason: "Tagged or named as blocked in Asana",
  }));

  const teamMembers = [
    ...new Set(
      tasks
        .map((task) => task.assignee?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  const recentCompletions = completed
    .filter((task) => {
      const age = daysAgo(task.completed_at ?? task.modified_at);
      return age !== null && age <= 7;
    })
    .slice(0, 20)
    .map((task) => `${task.gid}: ${task.name}`);

  const hasDates = Boolean(project.start_on || project.due_on);
  const confidence = tasks.length >= 3 && hasDates ? "HIGH" : tasks.length > 0 ? "MEDIUM" : "LOW";

  return {
    ...emptyNormalisedData("ASANA"),
    sprintName: project.name || config.externalName || "Asana project",
    sprintStartDate: project.start_on ?? "",
    sprintEndDate: project.due_on ?? "",
    tasksPlanned: tasks.length,
    tasksCompleted: completed.length,
    tasksInProgress: incomplete.length,
    blockers,
    recentCompletions,
    teamMembers,
    source: "ASANA",
    fetchedAt: new Date().toISOString(),
    confidence,
  };
}

export async function fetchAsanaPreviewData(connectorId: string) {
  return toPreviewData(await fetchAsanaProjectData(connectorId));
}
