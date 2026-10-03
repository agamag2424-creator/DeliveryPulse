import type { NormalisedTaskData } from "@/lib/connectors/types";
import { projectEmbeddingExists, storeProjectEmbedding } from "@/lib/db/embeddings";
import { embedText } from "@/lib/embeddings/embed";
import { usageActorForProject } from "@/lib/usage/actor";

export async function embedJiraSyncData(
  projectId: string,
  userId: string,
  data: NormalisedTaskData | null,
): Promise<void> {
  if (!data) {
    return;
  }

  const actor = (await usageActorForProject(projectId, userId)) ?? undefined;
  const sourceLabel = data.source;

  for (const blocker of data.blockers) {
    const sourceRef = blocker.issueKey;
    const exists = await projectEmbeddingExists(projectId, sourceRef);
    if (exists) {
      continue;
    }

    const content = `${sourceLabel} blocker ${blocker.issueKey}: ${blocker.summary}. Assignee: ${blocker.assignee}. Reason: ${blocker.reason}`;
    const embedding = await embedText(content, actor);
    await storeProjectEmbedding(projectId, userId, content, embedding, "JIRA_ISSUE", sourceRef);
  }

  for (const completion of data.recentCompletions) {
    const sourceRef = completion.split(":")[0]?.trim() ?? completion.slice(0, 32);
    const exists = await projectEmbeddingExists(projectId, `completion:${sourceRef}`);
    if (exists) {
      continue;
    }

    const content = `${sourceLabel} completion: ${completion}`;
    const embedding = await embedText(content, actor);
    await storeProjectEmbedding(projectId, userId, content, embedding, "JIRA_ISSUE", `completion:${sourceRef}`);
  }

  console.log(`embedJiraSyncData: processed ${sourceLabel} embeddings for project ${projectId}`);
}
