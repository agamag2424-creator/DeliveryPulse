import { trelloJson } from "@/lib/connectors/trello/client";
import { getConnectorById } from "@/lib/db/connectors";
import type { NormalisedBlocker, NormalisedTaskData } from "@/lib/connectors/types";
import { emptyNormalisedData, parseExternalConfig, toPreviewData } from "@/lib/connectors/types";

interface TrelloBoard {
  id: string;
  name: string;
  dateLastActivity?: string | null;
}

interface TrelloList {
  id: string;
  name: string;
  closed?: boolean;
}

interface TrelloCard {
  id: string;
  name: string;
  closed?: boolean;
  due?: string | null;
  dateLastActivity?: string | null;
  idList: string;
  labels?: Array<{ name?: string; color?: string }>;
  idMembers?: string[];
}

interface TrelloMember {
  id: string;
  fullName?: string;
  username?: string;
}

function listKind(name: string): "done" | "blocked" | "other" {
  const lower = name.toLowerCase();
  if (lower.includes("done") || lower.includes("complete") || lower.includes("ship")) {
    return "done";
  }
  if (lower.includes("block")) {
    return "blocked";
  }
  return "other";
}

function cardBlocked(card: TrelloCard, listName: string): boolean {
  if (listKind(listName) === "blocked") {
    return true;
  }
  return (card.labels ?? []).some((label) => (label.name ?? "").toLowerCase().includes("block") || label.color === "red");
}

export async function fetchTrelloBoardData(connectorId: string): Promise<NormalisedTaskData> {
  const connector = await getConnectorById(connectorId);
  if (!connector) {
    throw new Error("Connector not found");
  }

  const config = parseExternalConfig(connector.config);
  if (!config.externalId) {
    throw new Error("Trello board is not mapped for this connector");
  }

  const [board, lists, cards, members] = await Promise.all([
    trelloJson<TrelloBoard>(connectorId, `/boards/${config.externalId}?fields=name,dateLastActivity`),
    trelloJson<TrelloList[]>(connectorId, `/boards/${config.externalId}/lists?fields=name,closed&filter=open`),
    trelloJson<TrelloCard[]>(
      connectorId,
      `/boards/${config.externalId}/cards?fields=name,due,dateLastActivity,idList,labels,idMembers,closed&filter=open`,
    ),
    trelloJson<TrelloMember[]>(connectorId, `/boards/${config.externalId}/members?fields=fullName,username`),
  ]);

  const listById = new Map(lists.map((list) => [list.id, list]));
  const memberById = new Map(
    members.map((member) => [member.id, member.fullName || member.username || "Unassigned"]),
  );

  const openCards = cards.filter((card) => !card.closed);
  const classified = openCards.map((card) => {
    const listName = listById.get(card.idList)?.name ?? "";
    const kind = listKind(listName);
    const blocked = cardBlocked(card, listName);
    return { card, listName, kind, blocked };
  });

  const blockers: NormalisedBlocker[] = classified
    .filter((row) => row.blocked)
    .slice(0, 10)
    .map((row) => ({
      issueKey: row.card.id,
      summary: row.card.name,
      assignee: row.card.idMembers?.[0] ? (memberById.get(row.card.idMembers[0]) ?? "Unassigned") : "Unassigned",
      reason: row.listName || "Blocked label on Trello card",
    }));

  const teamMembers = [...new Set(members.map((member) => member.fullName || member.username).filter(Boolean))] as string[];

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCompletions = classified
    .filter((row) => {
      if (row.kind !== "done" || !row.card.dateLastActivity) {
        return false;
      }
      return new Date(row.card.dateLastActivity).getTime() >= weekAgo;
    })
    .slice(0, 20)
    .map((row) => `${row.card.id}: ${row.card.name}`);

  const confidence = openCards.length >= 3 ? "HIGH" : openCards.length > 0 ? "MEDIUM" : "LOW";

  return {
    ...emptyNormalisedData("TRELLO"),
    sprintName: board.name || config.externalName || "Trello board",
    sprintStartDate: "",
    sprintEndDate: "",
    tasksPlanned: openCards.length,
    tasksCompleted: classified.filter((row) => row.kind === "done").length,
    tasksInProgress: classified.filter((row) => row.kind === "other" && !row.blocked).length,
    blockers,
    recentCompletions,
    teamMembers,
    source: "TRELLO",
    fetchedAt: new Date().toISOString(),
    confidence,
  };
}

export async function fetchTrelloPreviewData(connectorId: string) {
  return toPreviewData(await fetchTrelloBoardData(connectorId));
}
