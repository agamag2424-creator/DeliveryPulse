import { asanaJson } from "@/lib/connectors/asana/client";
import type { ExternalResource } from "@/lib/connectors/types";

interface AsanaListResponse<T> {
  data: T[];
  next_page?: { offset: string } | null;
}

interface AsanaProject {
  gid: string;
  name: string;
  archived?: boolean;
}

export async function discoverAsanaProjects(connectorId: string): Promise<ExternalResource[]> {
  const seen = new Set<string>();
  const projects: ExternalResource[] = [];
  let offset: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const query = new URLSearchParams({
      opt_fields: "name,archived",
      limit: "100",
    });
    if (offset) {
      query.set("offset", offset);
    }

    const payload = await asanaJson<AsanaListResponse<AsanaProject>>(
      connectorId,
      `/projects?${query.toString()}`,
    );
    for (const project of payload.data) {
      if (project.archived || seen.has(project.gid)) {
        continue;
      }
      seen.add(project.gid);
      projects.push({ id: project.gid, key: project.gid, name: project.name });
    }

    offset = payload.next_page?.offset;
    if (!offset) {
      break;
    }
  }

  return projects;
}
