export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type LlmCompleteRequest = {
  system?: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /** Optional Chisoku Guard X-Guard-Session (vault / audit grouping). */
  session?: string;
};

export type LlmCompleteResult = TokenUsage & {
  text: string;
};

export interface LlmClient {
  readonly provider: string;
  readonly model: string;
  readonly missingConfigMessage: string;
  isConfigured(): boolean;
  complete(request: LlmCompleteRequest): Promise<LlmCompleteResult>;
}

export type EmbeddingResult = {
  embeddings: number[][];
  inputTokens: number;
};

export interface EmbeddingClient {
  readonly provider: string;
  readonly model: string;
  readonly missingConfigMessage: string;
  isConfigured(): boolean;
  embed(texts: string[]): Promise<EmbeddingResult>;
}
