import { getLlmModel, getLlmProviderId, type LlmProviderId } from "@/lib/ai/config";
import { AnthropicLlmClient } from "@/lib/ai/providers/anthropic-llm";
import type { LlmClient } from "@/lib/ai/types";

function createLlmClient(providerId: LlmProviderId): LlmClient {
  switch (providerId) {
    case "anthropic":
      return new AnthropicLlmClient(getLlmModel());
    default: {
      const exhaustive: never = providerId;
      throw new Error(`Unsupported LLM provider: ${String(exhaustive)}`);
    }
  }
}

let cached: { key: string; client: LlmClient } | null = null;

export function getLlmClient(): LlmClient {
  const providerId = getLlmProviderId();
  const model = getLlmModel();
  const key = `${providerId}:${model}`;
  if (!cached || cached.key !== key) {
    cached = { key, client: createLlmClient(providerId) };
  }
  return cached.client;
}
