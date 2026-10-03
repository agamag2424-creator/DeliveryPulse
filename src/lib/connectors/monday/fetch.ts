import { mondayGraphql } from "@/lib/connectors/monday/client";
import { getConnectorById } from "@/lib/db/connectors";
import type { NormalisedBlocker, NormalisedTaskData } from "@/lib/connectors/types";
import { emptyNormalisedData, parseExternalConfig, toPreviewData } from "@/lib/connectors/types";

interface MondayColumnValue {
  id: string;
  type: string;
  text: string | null;
}

interface MondayItem {
  id: string;
  name: string;
  updated_at?: string | null;
  group?: { title?: string } | null;
  column_values: MondayColumnValue[];
}

interface MondayBoardPayload {
  boards: Array<{
    id: string;
    name: string;
    items_page?: { items: MondayItem[] };
  }>;
}

function statusText(item: MondayItem): string {
  const statusColumn =
    item.column_values.find((column) => column.type === "status" || column.id === "status") ??
    item.column_values.find((column) => (column.text ?? "").length > 0 && column.type !== "name");
  return (statusColumn?.text ?? "").toLowerCase();
}

function ownerName(item: MondayItem): string {
  const people =
    item.column_values.find((column) => column.type === "people" || column.id.includes("person")) ??
    item.column_values.find((column) => column.id === "person");
  return people?.text?.trim() || "Unassigned";
}

function isDone(status: string): boolean {
  return status.includes("done") || status.includes("complete") || status.includes("ready");
}

function isBlocked(status: string, groupTitle: string): boolean {
  return status.includes("stuck") || status.includes("block") || groupTitle.includes("block");
}

function isInProgress(status: string, done: boolean, blocked: boolean): boolean {
  if (done || blocked) {
    return false;
  }
  return status.includes("working") || status.includes("progress") || status.length > 0;
}

export async function fetchMondayBoardData(connectorId: string): Promise<NormalisedTaskData> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const config = parseExternalConfig(connector.config);
  if (!config.externalId) {
    throw new Error("Monday board is not mapped for this connector");
  }

  const data = await mondayGraphql<MondayBoardPayload>(
    connectorId,
    `query ($ids: [ID!]) {
      boards(ids: $ids) {
        id
        name
        items_page(limit: 100) {
          items {
            id
            name
            updated_at
            group { title }
            column_values {
              id
              type
              text
            }
          }
        }
      }
    }`,
    { ids: [config.externalId] },
  );

  const board = data.boards[0];
  if (!board) {
    throw new Error("Monday board not found");
  }

  const items = board.items_page?.items ?? [];
  const classified = items.map((item) => {
    const status = statusText(item);
    const groupTitle = (item.group?.title ?? "").toLowerCase();
    const done = isDone(status);
    const blocked = isBlocked(status, groupTitle);
    return { item, status, groupTitle, done, blocked, inProgress: isInProgress(status, done, blocked) };
  });

  const blockers: NormalisedBlocker[] = classified
    .filter((row) => row.blocked)
    .slice(0, 10)
    .map((row) => ({
      issueKey: row.item.id,
      summary: row.item.name,
      assignee: ownerName(row.item),
      reason: row.status || row.item.group?.title || "Stuck on Monday board",
    }));

  const teamMembers = [
    ...new Set(items.map((item) => ownerName(item)).filter((name) => name !== "Unassigned")),
  ];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCompletions = classified
    .filter((row) => {
      if (!row.done || !row.item.updated_at) {
        return false;
      }
      return new Date(row.item.updated_at).getTime() >= weekAgo;
    })
    .slice(0, 20)
    .map((row) => `${row.item.id}: ${row.item.name}`);

  const confidence = items.length >= 3 ? "HIGH" : items.length > 0 ? "MEDIUM" : "LOW";

  return {
    ...emptyNormalisedData("MONDAY"),
    sprintName: board.name || config.externalName || "Monday board",
    sprintStartDate: "",
    sprintEndDate: "",
    tasksPlanned: items.length,
    tasksCompleted: classified.filter((row) => row.done).length,
    tasksInProgress: classified.filter((row) => row.inProgress || (!row.done && !row.blocked)).length,
    blockers,
    recentCompletions,
    teamMembers,
    source: "MONDAY",
    fetchedAt: new Date().toISOString(),
    confidence,
  };
}

export async function fetchMondayPreviewData(connectorId: string) {
  return toPreviewData(await fetchMondayBoardData(connectorId));
}
