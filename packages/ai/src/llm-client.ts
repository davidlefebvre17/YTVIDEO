// ─── Provider types ──────────────────────────────────────────────

type LLMProvider = "openrouter" | "anthropic";
export type LLMRole = "fast" | "balanced" | "quality";

interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
}

export interface LLMOptions {
  role?: LLMRole;
  maxTokens?: number;
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
  quality: "claude-opus-4-6",
};

const ANTHROPIC_MAX_TOKENS_DEFAULT = 8192;
const ANTHROPIC_VERSION = "2023-06-01";

// ─── Shared ──────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000); // 5 min timeout
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
      system: systemPrompt,
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
  return block?.text ?? "";
}

// ─── Unified entry point ─────────────────────────────────────────

function extractJSON(text: string): string {
  // Handle markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (jsonMatch?.[1]?.trim() || text.trim());
}

export async function generateStructuredJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options?: LLMOptions,
): Promise<T> {
  const config = getProviderConfig();
  const role: LLMRole = options?.role ?? "quality";
  const maxTokens = options?.maxTokens ?? ANTHROPIC_MAX_TOKENS_DEFAULT;
  let lastError: Error | null = null;

  if (config.provider === "anthropic") {
    const model = ANTHROPIC_MODELS[role];
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`  LLM: ${model} [${role}] (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const text = await callAnthropic(config.apiKey, model, systemPrompt, userMessage, maxTokens);
        const jsonStr = extractJSON(text);
        try {
          return JSON.parse(jsonStr) as T;
        } catch {
          console.warn(`  Malformed JSON (attempt ${attempt + 1}), retrying... Preview: ${jsonStr.slice(0, 200)}`);
          lastError = new Error(`JSON parse failed on attempt ${attempt + 1}`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
      } catch (err) {
        lastError = err as Error;
        const msg = lastError.message;

        if (msg.includes("429") || msg.includes("rate")) {
          console.warn(`  Rate-limited, waiting ${RETRY_DELAY_MS / 1000}s...`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        if (msg.includes("529") || msg.includes("overloaded")) {
          console.warn(`  Anthropic overloaded, waiting ${RETRY_DELAY_MS / 1000}s...`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        // Non-retryable
        break;
      }
    }
    throw new Error(`Anthropic [${model}] failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
  }

  // OpenRouter: cascade through models for the role
  const models = OPENROUTER_MODELS[role] ?? FREE_MODELS;
  for (const model of models) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`  LLM: ${model} [${role}] (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const text = await callOpenRouter(config.apiKey, model, systemPrompt, userMessage);
        const jsonStr = extractJSON(text);
        try {
          return JSON.parse(jsonStr) as T;
        } catch {
          console.warn(`  Malformed JSON from ${model} (attempt ${attempt + 1}), retrying... Preview: ${jsonStr.slice(0, 200)}`);
          lastError = new Error(`JSON parse failed on ${model} attempt ${attempt + 1}`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
      } catch (err) {
        lastError = err as Error;
        const msg = lastError.message;

        if (msg.includes("429") || msg.includes("rate-limit")) {
          console.warn(`  Rate-limited on ${model}, waiting ${RETRY_DELAY_MS / 1000}s...`);
          await sleep(RETRY_DELAY_MS);
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
