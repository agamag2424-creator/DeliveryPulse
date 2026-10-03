export const LLM_PROVIDER_IDS = ["anthropic"] as const;
export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export const EMBEDDING_PROVIDER_IDS = ["openai"] as const;
export type EmbeddingProviderId = (typeof EMBEDDING_PROVIDER_IDS)[number];

export const DEFAULT_LLM_PROVIDER: LlmProviderId = "anthropic";
export const DEFAULT_LLM_MODEL = "claude-sonnet-4-6";
export const DEFAULT_EMBEDDING_PROVIDER: EmbeddingProviderId = "openai";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

function isLlmProviderId(value: string): value is LlmProviderId {
  return (LLM_PROVIDER_IDS as readonly string[]).includes(value);
}

function isEmbeddingProviderId(value: string): value is EmbeddingProviderId {
  return (EMBEDDING_PROVIDER_IDS as readonly string[]).includes(value);
}

export function getLlmProviderId(): LlmProviderId {
  const raw = process.env.AI_LLM_PROVIDER?.trim().toLowerCase() || DEFAULT_LLM_PROVIDER;
  if (!isLlmProviderId(raw)) {
    throw new Error(
      `Unknown AI_LLM_PROVIDER "${raw}". Supported: ${LLM_PROVIDER_IDS.join(", ")}. See src/lib/ai/PROVIDERS.md.`,
    );
  }
  return raw;
}

export function getLlmModel(): string {
  return process.env.AI_LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
}

export function getEmbeddingProviderId(): EmbeddingProviderId {
  const raw = process.env.AI_EMBEDDING_PROVIDER?.trim().toLowerCase() || DEFAULT_EMBEDDING_PROVIDER;
  if (!isEmbeddingProviderId(raw)) {
    throw new Error(
      `Unknown AI_EMBEDDING_PROVIDER "${raw}". Supported: ${EMBEDDING_PROVIDER_IDS.join(", ")}. See src/lib/ai/PROVIDERS.md.`,
    );
  }
  return raw;
}

export function getEmbeddingModel(): string {
  return process.env.AI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}
