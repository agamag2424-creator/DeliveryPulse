import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

import { getEmbeddingModel } from "@/lib/ai/config";
import type { EmbeddingClient, EmbeddingResult } from "@/lib/ai/types";

const MAX_INPUT_CHARS = 8000;

function hasGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

function resolveOpenAiEmbeddingModel(model: string) {
  if (model.includes("/")) {
    return model;
  }
  if (!process.env.OPENAI_API_KEY?.trim() && hasGatewayAuth()) {
    return `openai/${model}`;
  }
  return openai.embeddingModel(model);
}

export class OpenAiEmbeddingClient implements EmbeddingClient {
  readonly provider = "openai";
  readonly model: string;
  readonly missingConfigMessage =
    "OPENAI_API_KEY is not set. Add it to .env.local — see .env.local.example.";

  constructor(model = getEmbeddingModel()) {
    this.model = model;
  }

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim()) || hasGatewayAuth();
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (!this.isConfigured()) {
      throw new Error(this.missingConfigMessage);
    }
    if (texts.length === 0) {
      return { embeddings: [], inputTokens: 0 };
    }

    const result = await embedMany({
      model: resolveOpenAiEmbeddingModel(this.model),
      values: texts.map((text) => text.slice(0, MAX_INPUT_CHARS)),
    });

    return {
      embeddings: result.embeddings,
      inputTokens: result.usage.tokens,
    };
  }
}
