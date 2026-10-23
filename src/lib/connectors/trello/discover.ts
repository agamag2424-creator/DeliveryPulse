import { trelloJson } from "@/lib/connectors/trello/client";
import type { ExternalResource } from "@/lib/connectors/types";

interface TrelloBoard {
  id: string;
  name: string;
  closed?: boolean;
}

export async function discoverTrelloBoards(connectorId: string): Promise<ExternalResource[]> {
  const boards = await trelloJson<TrelloBoard[]>(connectorId, "/members/me/boards?fields=name,closed&filter=open");
  return boards
    .filter((board) => !board.closed)
    .map((board) => ({ id: board.id, key: board.id, name: board.name }));
}
