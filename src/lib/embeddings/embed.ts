import { getEmbeddingClient } from "@/lib/ai/embeddings";
import type { UsageActor } from "@/lib/usage/constants";
import { recordUsageEvent } from "@/lib/usage/record";

async function recordEmbeddingUsage(
  actor: UsageActor | undefined,
  status: "SUCCESS" | "FAILURE",
  provider: string,
  model: string,
  inputTokens: number,
  error?: string,
): Promise<void> {
  if (!actor) {
    return;
  }
  await recordUsageEvent({
    organizationId: actor.organizationId,
    userId: actor.userId,
    kind: "EMBEDDING",
    status,
    provider,
    model,
    inputTokens,
    outputTokens: 0,
    error,
  });
}

export async function embedText(text: string, actor?: UsageActor): Promise<number[]> {
  const embeddings = await embedBatch([text], actor);
  const embedding = embeddings[0];
  if (!embedding) {
    throw new Error("Embedding provider returned no embedding vector.");
  }
  return embedding;
}

export async function embedBatch(texts: string[], actor?: UsageActor): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = getEmbeddingClient();
  try {
    const result = await client.embed(texts);
    await recordEmbeddingUsage(actor, "SUCCESS", client.provider, client.model, result.inputTokens);
    return result.embeddings;
  } catch (error) {
    await recordEmbeddingUsage(
      actor,
      "FAILURE",
      client.provider,
      client.model,
      0,
      error instanceof Error ? error.message : "Embedding failed",
    );
    throw error;
  }
}
