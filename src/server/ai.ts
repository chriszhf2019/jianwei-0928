import { GoogleGenAI } from "@google/genai";
import { NO_PERSIST, settings } from "./settings";
import {
  checkAiBudget,
  getAiUsageToday,
  getAiCostToday,
  recordAiUsageEvent,
  recordAuditEvent,
} from "./database";

export type AIProvider = "gemini" | "deepseek";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = settings.geminiApiKey;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI", e);
    return null;
  }
}

export function geminiKeyOk(): boolean {
  const k = settings.geminiApiKey;
  return !!k && k !== "MY_GEMINI_API_KEY";
}

export function deepseekKeyOk(): boolean {
  return !!settings.deepseekApiKey;
}

export function activeProvider(): AIProvider | null {
  const explicit = settings.aiChoice;
  if (explicit === "deepseek") return deepseekKeyOk() ? "deepseek" : geminiKeyOk() ? "gemini" : null;
  if (explicit === "gemini") return geminiKeyOk() ? "gemini" : deepseekKeyOk() ? "deepseek" : null;
  return geminiKeyOk() ? "gemini" : deepseekKeyOk() ? "deepseek" : null;
}

export function providerModel(provider: AIProvider): string {
  return provider === "deepseek"
    ? settings.deepseekModel || "deepseek-chat"
    : settings.geminiModel || "gemini-2.5-flash";
}

export interface AIResult {
  text: string;
  reasoning?: string;
}

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45_000);

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${AI_TIMEOUT_MS}ms`)), AI_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

interface UsageBucket {
  calls: number;
  promptChars: number;
  outputChars: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

let usage = {
  totalCalls: 0,
  promptChars: 0,
  outputChars: 0,
  promptTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  lastResetAt: new Date().toISOString(),
  byProvider: {} as Record<string, UsageBucket>,
};

function recordUsage(
  provider: AIProvider,
  model: string,
  prompt: string,
  output: string,
  tokens: { promptTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null } = {},
  status: "success" | "error" = "success",
  error?: unknown
): void {
  const bucket = usage.byProvider[`${provider}:${model}`] || {
    calls: 0,
    promptChars: 0,
    outputChars: 0,
    promptTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  bucket.calls += 1;
  bucket.promptChars += prompt.length;
  bucket.outputChars += output.length;
  bucket.promptTokens += Number(tokens.promptTokens || 0);
  bucket.outputTokens += Number(tokens.outputTokens || 0);
  bucket.totalTokens += Number(tokens.totalTokens || 0);
  usage.byProvider[`${provider}:${model}`] = bucket;
  usage.totalCalls += 1;
  usage.promptChars += prompt.length;
  usage.outputChars += output.length;
  usage.promptTokens += Number(tokens.promptTokens || 0);
  usage.outputTokens += Number(tokens.outputTokens || 0);
  usage.totalTokens += Number(tokens.totalTokens || 0);
  if (!NO_PERSIST) {
    try {
      recordAiUsageEvent({
        provider,
        model,
        promptChars: prompt.length,
        outputChars: output.length,
        promptTokens: tokens.promptTokens,
        outputTokens: tokens.outputTokens,
        totalTokens: tokens.totalTokens,
        status,
        error: error ? String((error as any)?.message || error).slice(0, 500) : null,
      });
    } catch (persistError) {
      console.error("failed to persist AI usage:", persistError);
    }
  }
  recordAuditEvent({
    actor: "system",
    action: "ai.call",
    entityType: "provider",
    entityId: `${provider}:${model}`,
    status,
    metadata: {
      promptChars: prompt.length,
      outputChars: output.length,
      promptTokens: tokens.promptTokens ?? null,
      outputTokens: tokens.outputTokens ?? null,
      totalTokens: tokens.totalTokens ?? null,
      error: error ? String((error as any)?.message || error).slice(0, 300) : null,
    },
  });
}

export function getAIUsage() {
  return {
    ...usage,
    persistedToday: NO_PERSIST ? null : getAiUsageToday(),
    costToday: NO_PERSIST ? null : getAiCostToday(),
    limits: {
      dailyCalls: Number(process.env.AI_DAILY_CALL_LIMIT || 500),
      dailyTokens: Number(process.env.AI_DAILY_TOKEN_LIMIT || 0),
    },
  };
}

export function resetAIUsage(): void {
  usage = {
    totalCalls: 0,
    promptChars: 0,
    outputChars: 0,
    promptTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    lastResetAt: new Date().toISOString(),
    byProvider: {},
  };
}

// 宽松 JSON 判定：与各调用点的容错口径一致（先直接 parse，再剥围栏重试）
function isLooseJson(text: string): boolean {
  if (!text) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    /* 继续尝试剥围栏 */
  }
  try {
    JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    return true;
  } catch {
    return false;
  }
}

interface OpenAICompatibleRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  json: boolean;
  usageProvider: AIProvider;
  label: string;
}

function isLoopbackBaseUrl(rawUrl: string): boolean {
  const value = String(rawUrl || "").replace(/\/+$/, "");
  if (!value) return false;
  try {
    const url = new URL(value.startsWith("http") ? value : `http://${value}`);
    return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function requestOllamaNative(req: OpenAICompatibleRequest): Promise<AIResult> {
  const base = String(req.baseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const nativeBase = base.replace(/\/v1\/?$/, "");
  const options: { temperature: number; num_predict?: number } = { temperature: req.temperature };
  const maxTokens = Number(process.env.AI_MAX_TOKENS || 0);
  if (maxTokens > 0) options.num_predict = maxTokens;
  const body: Record<string, unknown> = {
    model: req.model,
    messages: [{ role: "user", content: req.prompt }],
    stream: false,
    think: false,
    options,
  };
  if (req.json) body.format = "json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${nativeBase}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${req.label} HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    message?: { content?: string; thinking?: string };
    prompt_eval_count?: number;
    eval_count?: number;
  };
  const text = data.message?.content || "";
  if (!text) throw new Error(`${req.label} returned empty content`);
  if (process.env.AI_DEBUG_RAW_OUTPUT === "1") {
    console.error(`[${req.label}] raw AI output:\n${text}`);
  }
  recordUsage(req.usageProvider, req.model, req.prompt, text, {
    promptTokens: data.prompt_eval_count,
    outputTokens: data.eval_count,
    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
  });
  return { text };
}

async function requestOpenAICompatible(req: OpenAICompatibleRequest): Promise<AIResult> {
  const base = (req.baseUrl || "https://api.deepseek.com").replace(/\/+$/, "");
  const isReasoner = req.model.toLowerCase().includes("reasoner");
  const isLoopbackBase = isLoopbackBaseUrl(base);
  const body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream: boolean;
    temperature?: number;
    response_format?: { type: "json_object" };
    reasoning_effort?: "none";
    max_tokens?: number;
  } = {
    model: req.model,
    messages: [{ role: "user", content: req.prompt }],
    stream: false,
  };
  if (!isReasoner) {
    body.temperature = req.temperature;
    if (req.json) body.response_format = { type: "json_object" };
    // 本地 OpenAI 兼容服务（如 Ollama）生成复杂 JSON 时，关闭思考链可显著提高结构稳定性。
    if (req.json && isLoopbackBase) body.reasoning_effort = "none";
    const maxTokens = Number(process.env.AI_MAX_TOKENS || 0);
    if (maxTokens > 0) body.max_tokens = maxTokens;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${req.label} HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const message = data?.choices?.[0]?.message || {};
  const text: string = message.content || "";
  const reasoning: string | undefined = message.reasoning_content || undefined;
  if (!text) throw new Error(`${req.label} returned empty content`);
  recordUsage(req.usageProvider, req.model, req.prompt, text + (reasoning || ""), {
    promptTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
  });
  return { text, reasoning };
}

export async function runAI(
  prompt: string,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<AIResult> {
  const provider = activeProvider();
  if (!provider) throw new Error("no AI provider configured");
  if (!NO_PERSIST) {
    const budget = checkAiBudget(
      Number(process.env.AI_DAILY_CALL_LIMIT || 500),
      Number(process.env.AI_DAILY_TOKEN_LIMIT || 0)
    );
    if (!budget.allowed) {
      throw new Error(`ai_budget_exceeded:${budget.reason}:calls=${budget.usage.calls}`);
    }
  }
  const temperature = opts.temperature ?? 0.3;

  const fallbackReady = () =>
    settings.fallbackEnabled && !!settings.fallbackApiKey && !!settings.fallbackBaseUrl;

  const fallbackSameAsPrimary = () =>
    provider === "deepseek" &&
    (settings.fallbackBaseUrl || "https://api.deepseek.com").replace(/\/+$/, "") ===
      (settings.deepseekBaseUrl || "https://api.deepseek.com").replace(/\/+$/, "") &&
    (settings.fallbackModel || "deepseek-chat") === providerModel("deepseek");

  const runFallback = () =>
    requestOpenAICompatible({
      baseUrl: settings.fallbackBaseUrl,
      apiKey: settings.fallbackApiKey,
      model: settings.fallbackModel || "deepseek-chat",
      prompt,
      temperature,
      json: opts.json ?? false,
      usageProvider: "deepseek",
      label: "Fallback AI",
    });

  const runPrimary = async (): Promise<AIResult> => {
    if (provider === "gemini") {
      const ai = getGeminiClient();
      if (!ai) throw new Error("gemini client unavailable");
      const config: { temperature: number; responseMimeType?: string } = { temperature };
      if (opts.json) config.responseMimeType = "application/json";
      const response = await withTimeout(
        ai.models.generateContent({
          model: providerModel("gemini"),
          contents: prompt,
          config,
        }),
        "Gemini request"
      );
      const text = response.text || "";
      const usageMeta: any = (response as any).usageMetadata || {};
      recordUsage("gemini", providerModel("gemini"), prompt, text, {
        promptTokens: usageMeta.promptTokenCount,
        outputTokens: usageMeta.candidatesTokenCount,
        totalTokens: usageMeta.totalTokenCount,
      });
      return { text };
    }
    const request: OpenAICompatibleRequest = {
      baseUrl: settings.deepseekBaseUrl,
      apiKey: settings.deepseekApiKey,
      model: providerModel("deepseek"),
      prompt,
      temperature,
      json: opts.json ?? false,
      usageProvider: "deepseek",
      label: "DeepSeek",
    };
    if (request.json && isLoopbackBaseUrl(request.baseUrl)) {
      return requestOllamaNative(request);
    }
    return requestOpenAICompatible(request);
  };

  try {
    const primary = await runPrimary();
    // JSON 模式：主通道返回的文本若无法解析为 JSON，且配置了独立回退通道，则回退重试一次
    if (opts.json && !isLooseJson(primary.text) && fallbackReady() && !fallbackSameAsPrimary()) {
      return await runFallback();
    }
    return primary;
  } catch (error) {
    recordUsage(provider, providerModel(provider), prompt, "", {}, "error", error);
    // 传输层失败（HTTP 错误 / 超时 / 空内容）：同样回退一次
    if (fallbackReady() && !fallbackSameAsPrimary()) {
      try {
        return await runFallback();
      } catch (fallbackError) {
        recordUsage("deepseek", settings.fallbackModel || "deepseek-chat", prompt, "", {}, "error", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function callAI(
  prompt: string,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  return (await runAI(prompt, opts)).text;
}

export async function callAIWithReasoning(
  prompt: string,
  opts: { json?: boolean; temperature?: number } = {}
): Promise<AIResult> {
  return runAI(prompt, opts);
}
