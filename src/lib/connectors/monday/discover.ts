import { mondayGraphql } from "@/lib/connectors/monday/client";
import type { ExternalResource } from "@/lib/connectors/types";

interface MondayBoardsResponse {
  boards: Array<{ id: string; name: string }>;
}

export async function discoverMondayBoards(connectorId: string): Promise<ExternalResource[]> {
  const data = await mondayGraphql<MondayBoardsResponse>(
    connectorId,
    `query {
      boards(limit: 50) {
        id
        name
      }
    }`,
  );

  return (data.boards ?? []).map((board) => ({
    id: String(board.id),
    key: String(board.id),
    name: board.name,
  }));
}
