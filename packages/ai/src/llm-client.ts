// ─── Provider types ──────────────────────────────────────────────

type LLMProvider = "openrouter" | "anthropic" | "gemini";
export type LLMRole = "fast" | "balanced" | "quality";

interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
}

export interface LLMOptions<T = unknown> {
  role?: LLMRole;
  maxTokens?: number;
  /**
   * Active le prompt caching Anthropic sur le system prompt (cache_control ephemeral, TTL 5min).
   * Default true : Anthropic ignore silencieusement les blocs < 1024 tokens, donc safe à activer
   * partout. Les gros system prompts (C1/C2/C3/C5, P7a.5, C6 TTS) bénéficient de ~90% discount
   * sur les input tokens cachés lors des appels répétés dans la fenêtre TTL.
   */
  cacheSystem?: boolean;
  /**
   * Validateur optionnel appelé sur le JSON parsé. Si throws → comme un parse fail,
   * retry. Permet de plugger un schema Zod (ex: `validate: (raw) => MySchema.parse(raw)`).
   */
  validate?: (parsed: unknown) => T;
}

// ─── OpenRouter config ───────────────────────────────────────────

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

const OPENROUTER_MODELS: Record<LLMRole, string[]> = {
  fast: ["qwen/qwen3-4b:free", "google/gemini-2.0-flash-lite-001"],
  balanced: ["qwen/qwen3-235b-a22b-thinking-2507", "meta-llama/llama-3.3-70b-instruct:free"],
  quality: ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3-235b-a22b-thinking-2507"],
};

// Legacy fallback list (used when no role specified in openrouter mode)
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-235b-a22b-thinking-2507",
  "google/gemini-2.0-flash-lite-001",
  "qwen/qwen3-4b:free",
];

// ─── Anthropic config ────────────────────────────────────────────

const ANTHROPIC_BASE = "https://api.anthropic.com/v1/messages";

const ANTHROPIC_MODELS: Record<LLMRole, string> = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-6",
  // A/B: Sonnet 4.6 instead of Opus 4.7 for C3 writing — ~5x cheaper.
  // Compare quality on a few episodes; revert to "claude-opus-4-7" if needed.
  quality: "claude-sonnet-4-6",
};

const ANTHROPIC_MAX_TOKENS_DEFAULT = 8192;
const ANTHROPIC_VERSION = "2023-06-01";

// ─── Gemini config ──────────────────────────────────────────────

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_MODELS: Record<LLMRole, string> = {
  fast: "gemini-2.5-flash",
  balanced: "gemini-2.5-pro",
  quality: "gemini-3.1-pro",
};

const GEMINI_MAX_TOKENS_DEFAULT = 8192;

// ─── Shared ──────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Décide si une erreur LLM est retry-able.
 * Couvre :
 *   - rate limits (429)
 *   - overload upstream (529, 503)
 *   - bad gateway / gateway timeout (502, 504, 522, 524)
 *   - erreurs réseau (ECONNRESET, ETIMEDOUT, ECONNREFUSED, fetch failed, socket hang up)
 */
export function isRetryableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') || lower.includes('rate') || lower.includes('rate-limit') ||
    lower.includes('rate_limit') || lower.includes('resource_exhausted') ||
    lower.includes('529') || lower.includes('overload') ||
    lower.includes('502') || lower.includes('bad gateway') ||
    lower.includes('503') || lower.includes('service unavailable') ||
    lower.includes('504') || lower.includes('gateway timeout') ||
    lower.includes('522') || lower.includes('524') ||
    lower.includes('econnreset') || lower.includes('etimedout') ||
    lower.includes('econnrefused') || lower.includes('eai_again') ||
    lower.includes('fetch failed') || lower.includes('socket hang up') ||
    lower.includes('network') || lower.includes('timeout')
  );
}

/** Backoff exponentiel : 2s, 5s, 12s, 25s — randomisé ±20% pour éviter thundering herd */
export function backoffMs(attempt: number): number {
  const base = [2000, 5000, 12000, 25000][Math.min(attempt, 3)];
  const jitter = base * (0.8 + Math.random() * 0.4);
  return Math.round(jitter);
}

function getProviderConfig(): ProviderConfig {
  const provider = (process.env.LLM_PROVIDER || "openrouter") as LLMProvider;

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required when LLM_PROVIDER=anthropic");
    }
    return { provider, apiKey };
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required when LLM_PROVIDER=gemini");
    }
    return { provider, apiKey };
  }

  // Default: openrouter
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required when LLM_PROVIDER=openrouter");
  }
  return { provider: "openrouter", apiKey };
}

export function getLLMClient() {
  const config = getProviderConfig();
  return { provider: config.provider, apiKey: config.apiKey };
}

// ─── OpenRouter call ─────────────────────────────────────────────

async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const response = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter ${response.status} [${model}]: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Anthropic call ──────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = ANTHROPIC_MAX_TOKENS_DEFAULT,
  cacheSystem: boolean = true,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600_000); // 10 min timeout

  // Prompt caching : système passé en array de blocs avec cache_control ephemeral
  // si le prompt est assez gros pour que le cache ait du sens. Anthropic exige >= 1024
  // tokens par bloc cacheable (≈ 4096 chars), sinon renvoie une erreur.
  // Seuil sécurité à 5000 chars pour inclure une marge.
  const useCache = cacheSystem && systemPrompt.length >= 5000;
  const systemPayload = useCache
    ? [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }]
    : systemPrompt;

  const response = await fetch(ANTHROPIC_BASE, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPayload,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic ${response.status} [${model}]: ${errorBody}`);
  }

  const data = await response.json();
  const block = data.content?.[0];
  // Log cache usage when available (helps valider que le caching prend bien effet)
  const u = data.usage;
  if (u && (u.cache_creation_input_tokens || u.cache_read_input_tokens)) {
    const write = u.cache_creation_input_tokens ?? 0;
    const read = u.cache_read_input_tokens ?? 0;
    const input = u.input_tokens ?? 0;
    console.log(`    [cache] read=${read} write=${write} input=${input}`);
  }
  return block?.text ?? "";
}

// ─── Gemini call ────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = GEMINI_MAX_TOKENS_DEFAULT,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 600_000); // 10 min timeout
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
      },
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini ${response.status} [${model}]: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

// ─── Unified entry point ─────────────────────────────────────────

function extractJSON(text: string): string {
  // 1. Try markdown code fences (``` or ````+)
  const fenceMatch = text.match(/`{3,}(?:json)?\s*([\s\S]*?)`{3,}/);
  if (fenceMatch?.[1]?.trim()) return fenceMatch[1].trim();

  // 2. Truncated fence (no closing ```) — strip opening fence
  const openFence = text.match(/^`{3,}(?:json)?\s*\n?([\s\S]*)$/);
  if (openFence?.[1]?.trim()) {
    const stripped = openFence[1].trim();
    // Remove trailing ``` if partially present
    return stripped.replace(/`{1,3}\s*$/, "").trim();
  }

  // 3. Find outermost { ... } or [ ... ] as fallback
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  if (start >= 0) {
    const opener = text[start];
    const closer = opener === "{" ? "}" : "]";
    const lastClose = text.lastIndexOf(closer);
    if (lastClose > start) return text.slice(start, lastClose + 1);
  }

  return text.trim();
}

export async function generateStructuredJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options?: LLMOptions,
): Promise<T> {
  const config = getProviderConfig();
  const role: LLMRole = options?.role ?? "quality";
  const maxTokens = options?.maxTokens ?? ANTHROPIC_MAX_TOKENS_DEFAULT;
  const cacheSystem = options?.cacheSystem ?? true;
  let lastError: Error | null = null;

  if (config.provider === "anthropic") {
    const model = ANTHROPIC_MODELS[role];
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`  LLM: ${model} [${role}] (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const text = await callAnthropic(config.apiKey, model, systemPrompt, userMessage, maxTokens, cacheSystem);
        const jsonStr = extractJSON(text);
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          console.warn(`  Malformed JSON (attempt ${attempt + 1}), retrying... Preview: ${jsonStr.slice(0, 200)}`);
          lastError = new Error(`JSON parse failed on attempt ${attempt + 1}`);
          await sleep(backoffMs(attempt));
          continue;
        }
        if (options?.validate) {
          try {
            return options.validate(parsed) as T;
          } catch (err) {
            const msg = (err as Error).message.slice(0, 200);
            console.warn(`  Schema validation failed (attempt ${attempt + 1}): ${msg}`);
            lastError = err as Error;
            await sleep(backoffMs(attempt));
            continue;
          }
        }
        return parsed as T;
      } catch (err) {
        lastError = err as Error;
        const msg = lastError.message;

        if (isRetryableError(msg)) {
          const wait = backoffMs(attempt);
          console.warn(`  Retry-able error (${msg.slice(0, 80)}), backoff ${wait / 1000}s...`);
          await sleep(wait);
          continue;
        }
        // Non-retryable (auth, validation, etc.)
        break;
      }
    }
    throw new Error(`Anthropic [${model}] failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }

  if (config.provider === "gemini") {
    const model = GEMINI_MODELS[role];
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`  LLM: ${model} [${role}] (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const text = await callGemini(config.apiKey, model, systemPrompt, userMessage, maxTokens);
        const jsonStr = extractJSON(text);
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          console.warn(`  Malformed JSON (attempt ${attempt + 1}), retrying... Preview: ${jsonStr.slice(0, 200)}`);
          lastError = new Error(`JSON parse failed on attempt ${attempt + 1}`);
          await sleep(backoffMs(attempt));
          continue;
        }
        if (options?.validate) {
          try {
            return options.validate(parsed) as T;
          } catch (err) {
            const msg = (err as Error).message.slice(0, 200);
            console.warn(`  Schema validation failed (attempt ${attempt + 1}): ${msg}`);
            lastError = err as Error;
            await sleep(backoffMs(attempt));
            continue;
          }
        }
        return parsed as T;
      } catch (err) {
        lastError = err as Error;
        const msg = lastError.message;

        if (isRetryableError(msg)) {
          const wait = backoffMs(attempt);
          console.warn(`  Retry-able error (${msg.slice(0, 80)}), backoff ${wait / 1000}s...`);
          await sleep(wait);
          continue;
        }
        // Non-retryable
        break;
      }
    }
    throw new Error(`Gemini [${model}] failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }

  // OpenRouter: cascade through models for the role
  const models = OPENROUTER_MODELS[role] ?? FREE_MODELS;
  for (const model of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`  LLM: ${model} [${role}] (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const text = await callOpenRouter(config.apiKey, model, systemPrompt, userMessage);
        const jsonStr = extractJSON(text);
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          console.warn(`  Malformed JSON from ${model} (attempt ${attempt + 1}), retrying... Preview: ${jsonStr.slice(0, 200)}`);
          lastError = new Error(`JSON parse failed on ${model} attempt ${attempt + 1}`);
          await sleep(backoffMs(attempt));
          continue;
        }
        if (options?.validate) {
          try {
            return options.validate(parsed) as T;
          } catch (err) {
            console.warn(`  Schema validation failed on ${model} (attempt ${attempt + 1}): ${(err as Error).message.slice(0, 200)}`);
            lastError = err as Error;
            await sleep(backoffMs(attempt));
            continue;
          }
        }
        return parsed as T;
      } catch (err) {
        lastError = err as Error;
        const msg = lastError.message;

        if (isRetryableError(msg)) {
          const wait = backoffMs(attempt);
          console.warn(`  Retry-able error on ${model} (${msg.slice(0, 80)}), backoff ${wait / 1000}s...`);
          await sleep(wait);
          continue;
        }

        // Non-retryable error for this model — try next
        console.warn(`  ${model} failed: ${msg.slice(0, 120)}`);
        break;
      }
    }
  }

  throw new Error(`All models exhausted [${role}]. Last error: ${lastError?.message}`);
}
