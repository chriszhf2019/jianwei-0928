import { settings } from "./settings";

export interface CostMetrics {
  dailyBudget: number;
  dailySpent: number;
  remaining: number;
  usage: {
    calls: number;
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  byProvider: Record<string, { calls: number; promptTokens: number; outputTokens: number; totalTokens: number; }>;
  alerts: string[];
  rateLimitStatus: { current: number; limit: number; remaining: number; };
}

export interface CostEstimate {
  provider: string;
  model: string;
  promptChars: number;
  outputChars: number;
  estimatedTokens: number;
  estimatedCost: number;
}

const PRICING = {
  gemini: {
    "gemini-2.5-flash": { inputPerM: 0.075, outputPerM: 0.30 },
    "gemini-2.5-pro": { inputPerM: 1.50, outputPerM: 6.00 },
  },
  deepseek: {
    "deepseek-chat": { inputPerM: 0.14, outputPerM: 0.28 },
    "deepseek-reasoner": { inputPerM: 0.55, outputPerM: 2.19 },
  },
};

export function estimateCost(usage: any): number {
  let total = 0;
  for (const [key, bucket] of Object.entries(usage.byProvider || {}) as Array<[string, any]>) {
    const [provider, model] = key.split(":");
    const pricing = (PRICING as any)[provider]?.[model] as { inputPerM: number; outputPerM: number } | undefined;
    if (pricing) {
      total += (bucket.promptTokens || 0) * pricing.inputPerM / 1000000;
      total += (bucket.outputTokens || 0) * pricing.outputPerM / 1000000;
    }
  }
  return Math.round(total * 100) / 100;
}

export function getCostMetrics(usage: any): CostMetrics {
  const dailyBudget = Number(process.env.AI_DAILY_BUDGET || 100);
  const dailySpent = estimateCost(usage);
  const remaining = dailyBudget - dailySpent;
  
  const alerts: string[] = [];
  if (remaining < 10) alerts.push("⚠️ 今日预算即将耗尽 (剩余 ¥10)");
  if (remaining < 0) alerts.push("🛑 已超出预算 ¥" + Math.abs(remaining));
  if (usage.limits?.dailyCalls) {
    const callsRemaining = usage.limits.dailyCalls - usage.totalCalls;
    if (callsRemaining < 50) alerts.push("⚠️ AI 调用次数即将耗尽 (剩余 " + callsRemaining + ")");
  }
  
  return {
    dailyBudget,
    dailySpent,
    remaining,
    usage: {
      calls: usage.totalCalls,
      promptTokens: usage.promptTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    },
    byProvider: usage.byProvider || {},
    alerts,
    rateLimitStatus: {
      current: Object.values(usage.byProvider || {}).reduce((sum: number, b: any) => sum + (b.calls || 0), 0),
      limit: usage.limits?.dailyCalls || 500,
      remaining: (usage.limits?.dailyCalls || 500) - usage.totalCalls,
    },
  };
}

export function estimateNextRequest(prompt: string, outputEstimateChars: number = 500): CostEstimate {
  const provider = settings.aiChoice || (settings.geminiApiKey ? "gemini" : settings.deepseekApiKey ? "deepseek" : null);
  if (!provider) return { provider: "none", model: "none", promptChars: prompt.length, outputChars: outputEstimateChars, estimatedTokens: 0, estimatedCost: 0 };
  
  const model = provider === "deepseek" ? (settings.deepseekModel || "deepseek-chat") : (settings.geminiModel || "gemini-2.5-flash");
  const pricing = (PRICING as any)[provider]?.[model] as { inputPerM: number; outputPerM: number } | undefined;
  
  const promptTokens = Math.ceil(prompt.length / 3.5);
  const outputTokens = Math.ceil(outputEstimateChars / 3.5);
  const estimatedTokens = promptTokens + outputTokens;
  
  let estimatedCost = 0;
  if (pricing) {
    estimatedCost = (promptTokens * pricing.inputPerM + outputTokens * pricing.outputPerM) / 1000000;
  }
  
  return {
    provider,
    model,
    promptChars: prompt.length,
    outputChars: outputEstimateChars,
    estimatedTokens,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000,
  };
}
