/**
 * Epic 4: provider-agnostic LLM + embedding clients; Anthropic/OpenAI behind the interface.
 *
 * Usage: npx tsx scripts/verify-epic-4-ai-providers.ts
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import "./load-local-env";

import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_LLM_MODEL,
  getEmbeddingProviderId,
  getLlmProviderId,
} from "../src/lib/ai/config";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function readSrc(relativePath: string): string {
  return readFileSync(join(__dirname, "..", relativePath), "utf8");
}

function assertCallSitesUseInterface(): void {
  const generate = readSrc("src/lib/claude/generateReport.ts");
  assert(generate.includes("getLlmClient()"), "generateReport must call getLlmClient");
  assert(!generate.includes("@anthropic-ai/sdk"), "generateReport must not import Anthropic SDK");
  assert(!generate.includes('from "openai"'), "generateReport must not import OpenAI SDK");

  const gaps = readSrc("src/lib/agent/gapExtract.ts");
  assert(gaps.includes("getLlmClient()"), "gapExtract must call getLlmClient");
  assert(!gaps.includes("@anthropic-ai/sdk"), "gapExtract must not import Anthropic SDK");

  const embed = readSrc("src/lib/embeddings/embed.ts");
  assert(embed.includes("getEmbeddingClient()"), "embed.ts must call getEmbeddingClient");
  assert(!embed.includes('from "openai"'), "embed.ts must not import OpenAI SDK");

  const llmFactory = readSrc("src/lib/ai/llm.ts");
  assert(llmFactory.includes("const exhaustive: never"), "LLM factory must exhaust provider ids");
  assert(llmFactory.includes('case "anthropic"'), "Anthropic is the current LLM implementation");

  const anthropicProvider = readSrc("src/lib/ai/providers/anthropic-llm.ts");
  assert(anthropicProvider.includes("useChisokuGuard"), "Anthropic client supports Chisoku Guard");
  assert(anthropicProvider.includes("createAnthropic"), "Guard path uses createAnthropic with baseURL");
  assert(existsSync(join(__dirname, "../src/lib/ai/guard.ts")), "src/lib/ai/guard.ts holds Guard env helpers");

  const embedFactory = readSrc("src/lib/ai/embeddings.ts");
  assert(embedFactory.includes("const exhaustive: never"), "embedding factory must exhaust provider ids");
  assert(embedFactory.includes('case "openai"'), "OpenAI is the current embedding implementation");

  console.log("✓ call sites use LlmClient / EmbeddingClient; Anthropic + OpenAI sit behind factories");
}

function assertDocsAndPackage(): void {
  assert(existsSync(join(__dirname, "../src/lib/ai/PROVIDERS.md")), "src/lib/ai/PROVIDERS.md documents adding a provider");
  const docs = readSrc("src/lib/ai/PROVIDERS.md");
  assert(docs.includes("LLM_PROVIDER_IDS"), "docs name the config list to extend");
  assert(docs.includes("AI_LLM_MODEL"), "docs cover model switching via env");

  const pkg = JSON.parse(readSrc("package.json")) as { dependencies: Record<string, string> };
  assert(!pkg.dependencies["@langchain/anthropic"], "unused @langchain/anthropic must be removed");
  assert(Boolean(pkg.dependencies.ai), "AI SDK is the transport for current providers");
  assert(Boolean(pkg.dependencies["@ai-sdk/anthropic"]), "Anthropic AI SDK provider is installed");
  assert(Boolean(pkg.dependencies["@ai-sdk/openai"]), "OpenAI AI SDK provider is installed");

  console.log("✓ PROVIDERS.md + unused LangChain Anthropic removed");
}

function assertConfigDefaults(): void {
  assert(DEFAULT_LLM_MODEL === "claude-sonnet-4-6", "default LLM model is Claude Sonnet 4.6");
  assert(DEFAULT_EMBEDDING_MODEL === "text-embedding-3-small", "default embedding model is unchanged");
  assert(getLlmProviderId() === "anthropic", "default LLM provider is anthropic");
  assert(getEmbeddingProviderId() === "openai", "default embedding provider is openai");

  const previous = process.env.AI_LLM_PROVIDER;
  process.env.AI_LLM_PROVIDER = "not-a-real-provider";
  try {
    getLlmProviderId();
    throw new Error("unknown LLM provider should throw");
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes("Unknown AI_LLM_PROVIDER"),
      "unknown AI_LLM_PROVIDER must fail closed",
    );
  } finally {
    if (previous === undefined) {
      delete process.env.AI_LLM_PROVIDER;
    } else {
      process.env.AI_LLM_PROVIDER = previous;
    }
  }

  console.log("✓ default models unchanged; unknown provider fails closed");
}

function main(): void {
  assertCallSitesUseInterface();
  assertDocsAndPackage();
  assertConfigDefaults();
  console.log("\n✓ Epic 4 AI provider abstraction verification passed");
}

main();
