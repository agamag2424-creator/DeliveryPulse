# Adding an AI provider or model

Call sites (`generateReport`, gap extract, `embed.ts`) use only `LlmClient` / `EmbeddingClient`. They must not import vendor SDKs.

Current defaults (Anthropic + OpenAI, via the Vercel AI SDK):

- LLM: `anthropic` / `claude-sonnet-4-6`
- Embeddings: `openai` / `text-embedding-3-small`

## Switch the current model (no code)

`.env.local`:

```
AI_LLM_PROVIDER=anthropic
AI_LLM_MODEL=claude-sonnet-4-6
AI_EMBEDDING_PROVIDER=openai
AI_EMBEDDING_MODEL=text-embedding-3-small
```

Bare model ids use the Anthropic / OpenAI API keys already in `.env.local`.

To route through Vercel AI Gateway instead, set a `provider/model` id (and `AI_GATEWAY_API_KEY` or `vercel env pull` OIDC):

```
AI_LLM_MODEL=anthropic/claude-sonnet-4-6
AI_EMBEDDING_MODEL=openai/text-embedding-3-small
```

Restart `npm run dev`.

## Add a new LLM provider

1. Implement `LlmClient` in `src/lib/ai/providers/<name>-llm.ts`. `complete` must return `text`, `inputTokens`, `outputTokens`.
2. Add the id to `LLM_PROVIDER_IDS` in `src/lib/ai/config.ts`.
3. Add a `case` in `createLlmClient` in `src/lib/ai/llm.ts`. The `default: never` check fails the build until you do.
4. Set `AI_LLM_PROVIDER=<id>` and any keys that class needs.

## Add a new embedding provider

Same steps with `EmbeddingClient`, `EMBEDDING_PROVIDER_IDS`, `src/lib/ai/embeddings.ts`, and `AI_EMBEDDING_PROVIDER`.

Keep vectors at 1536 dimensions unless you also migrate stored `vector(1536)` embeddings.

## Do not

- Import a vendor SDK from `generateReport.ts`, `gapExtract.ts`, or `embed.ts`.
- Hardcode a model id at a call site. Read it from config / the client.
