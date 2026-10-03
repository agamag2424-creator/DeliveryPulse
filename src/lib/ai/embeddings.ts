import {
  getEmbeddingModel,
  getEmbeddingProviderId,
  type EmbeddingProviderId,
} from "@/lib/ai/config";
import { OpenAiEmbeddingClient } from "@/lib/ai/providers/openai-embeddings";
import type { EmbeddingClient } from "@/lib/ai/types";

function createEmbeddingClient(providerId: EmbeddingProviderId): EmbeddingClient {
  switch (providerId) {
    case "openai":
      return new OpenAiEmbeddingClient(getEmbeddingModel());
    default: {
      const exhaustive: never = providerId;
      throw new Error(`Unsupported embedding provider: ${String(exhaustive)}`);
    }
  }
}

let cached: { key: string; client: EmbeddingClient } | null = null;

export function getEmbeddingClient(): EmbeddingClient {
  const providerId = getEmbeddingProviderId();
  const model = getEmbeddingModel();
  const key = `${providerId}:${model}`;
  if (!cached || cached.key !== key) {
    cached = { key, client: createEmbeddingClient(providerId) };
  }
  return cached.client;
}
