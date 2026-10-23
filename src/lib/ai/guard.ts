/**
 * Chisoku Guard (E14.4) — optional LLM proxy via GUARD_BASE_URL + GUARD_API_KEY.
 *
 * When both are set, Anthropic chat completions go through Guard (mask / screen /
 * route). Embeddings stay on OpenAI directly — Guard does not proxy embeddings.
 */

export function getGuardBaseUrl(): string | null {
  const raw = process.env.GUARD_BASE_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/$/, "");
  // @ai-sdk/anthropic defaults to https://api.anthropic.com/v1
  return base.endsWith("/v1") ? base : `${base}/v1`;
}

export function getGuardApiKey(): string | null {
  const key = process.env.GUARD_API_KEY?.trim();
  return key || null;
}

/** True when LLM traffic should use Chisoku Guard instead of Anthropic directly. */
export function useChisokuGuard(): boolean {
  return Boolean(getGuardBaseUrl() && getGuardApiKey());
}

/**
 * Build X-Guard-Session. Fetch/undici require header values to be ByteStrings
 * (codepoints ≤ 255); project names often contain em dashes (U+2014) and other
 * Unicode, which otherwise throw before the request leaves the process.
 */
export function guardSessionHeader(sessionId: string | undefined): Record<string, string> {
  if (!sessionId?.trim()) return {};
  const value = sessionId
    .trim()
    .normalize("NFKD")
    // Keep printable ASCII only; collapse everything else to a single hyphen.
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  if (!value) return {};
  return { "X-Guard-Session": value };
}
