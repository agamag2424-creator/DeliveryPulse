import { generateText, gateway } from "ai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";

import { getLlmModel } from "@/lib/ai/config";
import {
  getGuardApiKey,
  getGuardBaseUrl,
  guardSessionHeader,
  useChisokuGuard,
} from "@/lib/ai/guard";
import type { LlmClient, LlmCompleteRequest, LlmCompleteResult } from "@/lib/ai/types";

function hasGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim());
}

function resolveAnthropicModel(model: string, sessionId?: string) {
  if (useChisokuGuard()) {
    const baseURL = getGuardBaseUrl()!;
    const apiKey = getGuardApiKey()!;
    // Guard authenticates with Authorization: Bearer (app key), not x-api-key.
    const guard = createAnthropic({
      baseURL,
      authToken: apiKey,
      headers: guardSessionHeader(sessionId),
    });
    return guard(model);
  }
  if (model.includes("/")) {
    return gateway(model);
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim() && hasGatewayAuth()) {
    return gateway(`anthropic/${model}`);
  }
  return anthropic(model);
}

export class AnthropicLlmClient implements LlmClient {
  readonly provider = "anthropic";
  readonly model: string;

  constructor(model = getLlmModel()) {
    this.model = model;
  }

  get missingConfigMessage(): string {
    if (useChisokuGuard()) {
      return "GUARD_BASE_URL and GUARD_API_KEY must both be set (Chisoku Guard). See src/lib/ai/PROVIDERS.md.";
    }
    return "ANTHROPIC_API_KEY is not configured. Add it to .env.local for local dev, then restart `npm run dev`.";
  }

  isConfigured(): boolean {
    if (useChisokuGuard()) return true;
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim()) || hasGatewayAuth();
  }

  async complete(request: LlmCompleteRequest): Promise<LlmCompleteResult> {
    if (!this.isConfigured()) {
      throw new Error(this.missingConfigMessage);
    }

    const result = await generateText({
      model: resolveAnthropicModel(this.model, request.session),
      instructions: request.system,
      prompt: request.user,
      maxOutputTokens: request.maxTokens,
      temperature: request.temperature,
    });

    return {
      text: result.text,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  }
}
