import { spawn } from "node:child_process";
import type { Express, Request, Response } from "express";
import {
  getBriefingDeliveryStatus,
  getBriefingSubscription,
  getDailyBriefing,
  getUserPreferences,
  listBriefingSubscriptions,
  listPredictionContracts,
  markDailyBriefingRead,
  recordAuditEvent,
  recordBriefingDelivery,
  saveBriefingSubscription,
  saveDailyBriefing,
} from "./database";
import { serverCorpus } from "./corpus";
import { NO_PERSIST } from "./settings";
import { validatePublicOutboundBaseUrl } from "./sourceVerification";
import {
  briefingClock,
  buildMorningBriefing,
  isBriefingDue,
} from "../utils/briefing";
import type {
  BriefingSettings,
  MorningBriefing,
  NewsArticle,
  PredictionContract,
  RadarKeyword,
  UserPersonaId,
} from "../types";
import { USER_PERSONAS } from "../data/intelligenceData";

const BRIEFING_CHECK_INTERVAL_MS = Math.max(
  30_000,
  Number(process.env.BRIEFING_CHECK_INTERVAL_MS || 60_000)
);
const WEBHOOK_TIMEOUT_MS = Math.max(
  3_000,
  Number(process.env.BRIEFING_WEBHOOK_TIMEOUT_MS || 15_000)
);

const PERSONA_IDS = new Set<UserPersonaId>(USER_PERSONAS.map((persona) => persona.id));

export function systemNotificationAvailable(): boolean {
  return process.platform === "darwin";
}

function defaultBriefingSettings(personaId: UserPersonaId = "investor"): BriefingSettings {
  return {
    enabled: false,
    displayAfter: "08:00",
    timezone: "Asia/Shanghai",
    personaId,
    externalChannel: "none",
    includeRadar: true,
    includePredictions: true,
  };
}

function validTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function sanitizeBriefingSettings(input: unknown): BriefingSettings {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const personaId = PERSONA_IDS.has(String(raw.personaId) as UserPersonaId)
    ? String(raw.personaId) as UserPersonaId
    : "investor";
  const timezone = validTimeZone(String(raw.timezone || ""))
    ? String(raw.timezone)
    : "Asia/Shanghai";
  const displayAfter = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw.displayAfter || ""))
    ? String(raw.displayAfter)
    : "08:00";
  const requestedChannel = String(raw.externalChannel || "none");
  const externalChannel =
    requestedChannel === "system" && systemNotificationAvailable()
      ? "system"
      : requestedChannel === "webhook"
        ? "webhook"
        : "none";
  const webhookUrl = String(raw.webhookUrl || "").trim().slice(0, 2000);
  if (externalChannel === "webhook" && !webhookUrl) {
    throw new Error("webhook_url_required");
  }
  return {
    enabled: raw.enabled === true,
    displayAfter,
    timezone,
    personaId,
    externalChannel,
    webhookUrl: externalChannel === "webhook" ? webhookUrl : undefined,
    includeRadar: raw.includeRadar !== false,
    includePredictions: raw.includePredictions !== false,
    updatedAt: new Date().toISOString(),
  };
}

export function readBriefingSettings(userId: string): BriefingSettings {
  const prefs = NO_PERSIST ? { payload: null } : getUserPreferences(userId);
  const personaId = PERSONA_IDS.has(String(prefs.payload?.selectedPersonaId) as UserPersonaId)
    ? String(prefs.payload?.selectedPersonaId) as UserPersonaId
    : "investor";
  const stored = NO_PERSIST ? null : getBriefingSubscription(userId).settings;
  return {
    ...defaultBriefingSettings(personaId),
    ...(stored || {}),
  };
}

function currentBriefingDate(settings: BriefingSettings): string {
  return briefingClock(new Date(), settings.timezone).date;
}

export function getOrCreateBriefing(
  userId: string,
  settings: BriefingSettings,
  force = false
): MorningBriefing {
  const date = currentBriefingDate(settings);
  const existing = NO_PERSIST ? null : getDailyBriefing(userId, date);
  if (existing && !force) return existing;
  const prefs = NO_PERSIST ? null : getUserPreferences(userId).payload;
  const radarKeywords = Array.isArray(prefs?.radarKeywords)
    ? prefs.radarKeywords as RadarKeyword[]
    : [];
  const predictions = NO_PERSIST
    ? []
    : listPredictionContracts(userId) as unknown as PredictionContract[];
  const briefing = buildMorningBriefing({
    userId,
    articles: serverCorpus as NewsArticle[],
    settings,
    predictions,
    radarKeywords: settings.includeRadar ? radarKeywords : [],
    now: new Date(),
  });
  if (!settings.includePredictions) briefing.predictionsDue = [];
  if (!NO_PERSIST) saveDailyBriefing(briefing);
  return briefing;
}

function notificationText(briefing: MorningBriefing): { title: string; body: string } {
  const title = `见微晨报 · ${briefing.date}`;
  const first = briefing.keyChanges[0];
  const body = [
    first ? `重点：${first.title}` : briefing.summary,
    briefing.radarHits.length > 0 ? `监控命中 ${briefing.radarHits.length} 条` : '',
    briefing.predictionsDue.length > 0 ? `待复核预测 ${briefing.predictionsDue.length} 条` : '',
  ]
    .filter(Boolean)
    .join('；')
    .slice(0, 240);
  return { title, body: body || briefing.summary.slice(0, 240) };
}

function deliveryTarget(settings: BriefingSettings): string {
  if (settings.externalChannel !== "webhook") return process.platform;
  try {
    return new URL(String(settings.webhookUrl || "")).hostname;
  } catch {
    return "invalid-webhook";
  }
}

async function deliverSystemNotification(briefing: MorningBriefing): Promise<void> {
  if (!systemNotificationAvailable()) throw new Error("system_notification_unavailable");
  const { title, body } = notificationText(briefing);
  const script = [
    "on run argv",
    "display notification (item 2 of argv) with title (item 1 of argv)",
    "end run",
  ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn("osascript", [
      "-e", script[0],
      "-e", script[1],
      "-e", script[2],
      title,
      body,
    ], { stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("system_notification_timeout"));
    }, 10_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`system_notification_exit_${code}`));
    });
  });
}

async function deliverWebhook(settings: BriefingSettings, briefing: MorningBriefing): Promise<void> {
  const rawUrl = String(settings.webhookUrl || "").trim();
  if (!rawUrl) throw new Error("webhook_url_missing");
  const url = await validatePublicOutboundBaseUrl(rawUrl);
  const { title, body } = notificationText(briefing);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  const host = url.hostname.toLowerCase();
  const isNtfy = host === "ntfy.sh" || host.endsWith(".ntfy.sh");
  const isBark = host === "api.day.app" || host.endsWith(".day.app");
  const payload = isNtfy
    ? body
    : isBark
      ? { title, body, group: "见微", level: "active" }
      : {
          source: "见微 Genway",
          title,
          content: body,
          briefing,
        };
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      redirect: "manual",
      headers: isNtfy
        ? {
            "Content-Type": "text/plain; charset=utf-8",
            "Title": title,
            "Priority": briefing.predictionsDue.length > 0 ? "high" : "default",
            "Tags": "newspaper",
          }
        : { "Content-Type": "application/json" },
      body: isNtfy ? payload as string : JSON.stringify(payload),
    });
    if (response.status >= 300 && response.status < 400) {
      throw new Error("webhook_redirect_not_allowed");
    }
    if (!response.ok) throw new Error(`webhook_http_${response.status}`);
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("webhook_timeout");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function deliverBriefing(
  settings: BriefingSettings,
  briefing: MorningBriefing,
  channel = settings.externalChannel
): Promise<{ ok: boolean; channel: string; reason?: string }> {
  if (channel === "none") return { ok: true, channel };
  try {
    if (channel === "system") await deliverSystemNotification(briefing);
    else if (channel === "webhook") await deliverWebhook(settings, briefing);
    else throw new Error("unsupported_briefing_channel");
    return { ok: true, channel };
  } catch (error: any) {
    return { ok: false, channel, reason: String(error?.message || error).slice(0, 500) };
  }
}

function userIdOf(req: Request): string {
  return String((req as any).auth?.userId || "local").slice(0, 120) || "local";
}

function briefingResponse(userId: string) {
  const settings = readBriefingSettings(userId);
  const briefing = settings.enabled ? getOrCreateBriefing(userId, settings) : null;
  return {
    settings,
    briefing,
    shouldShow: Boolean(
      settings.enabled &&
      briefing &&
      !briefing.readAt &&
      isBriefingDue(settings)
    ),
    systemNotificationAvailable: systemNotificationAvailable(),
  };
}

export function registerBriefingRoutes(app: Express, applyRateLimit: any): void {
  app.get("/api/briefing/today", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = userIdOf(_req);
    try {
      res.json({ ok: true, ...briefingResponse(userId) });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: String(error?.message || error) });
    }
  });

  app.get("/api/briefing/settings", (_req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = userIdOf(_req);
    res.json({
      ok: true,
      settings: readBriefingSettings(userId),
      systemNotificationAvailable: systemNotificationAvailable(),
    });
  });

  app.put("/api/briefing/settings", applyRateLimit, async (req, res) => {
    const userId = userIdOf(req);
    try {
      const settings = sanitizeBriefingSettings(req.body?.settings ?? req.body);
      if (settings.externalChannel === "webhook") {
        await validatePublicOutboundBaseUrl(String(settings.webhookUrl || ""));
      }
      if (!NO_PERSIST) saveBriefingSubscription(userId, settings);
      recordAuditEvent({
        actor: String((req as any).auth?.username || userId),
        action: "briefing.settings.update",
        entityType: "briefing_subscription",
        entityId: userId,
        metadata: {
          enabled: settings.enabled,
          displayAfter: settings.displayAfter,
          timezone: settings.timezone,
          externalChannel: settings.externalChannel,
        },
      });
      res.json({
        ok: true,
        settings,
        briefing: settings.enabled ? getOrCreateBriefing(userId, settings, true) : null,
        systemNotificationAvailable: systemNotificationAvailable(),
      });
    } catch (error: any) {
      res.status(400).json({ ok: false, error: String(error?.message || error) });
    }
  });

  app.post("/api/briefing/ack", applyRateLimit, (req, res) => {
    const userId = userIdOf(req);
    const settings = readBriefingSettings(userId);
    const date = String(req.body?.date || currentBriefingDate(settings));
    const ok = !NO_PERSIST && markDailyBriefingRead(userId, date);
    res.json({ ok, date });
  });

  app.post("/api/briefing/test", applyRateLimit, async (req, res) => {
    const userId = userIdOf(req);
    try {
      const settings = sanitizeBriefingSettings({
        ...readBriefingSettings(userId),
        ...(req.body?.settings || {}),
        enabled: true,
      });
      const briefing = getOrCreateBriefing(userId, settings, true);
      const result = await deliverBriefing(settings, briefing);
      if (!NO_PERSIST) {
        recordBriefingDelivery({
          userId,
          date: briefing.date,
          channel: settings.externalChannel,
          status: result.ok ? "success" : "error",
          target: deliveryTarget(settings),
          error: result.reason,
        });
      }
      res.status(result.ok ? 200 : 400).json({ ok: result.ok, result });
    } catch (error: any) {
      res.status(400).json({ ok: false, error: String(error?.message || error) });
    }
  });
}

export async function runScheduledBriefings(): Promise<{
  at: string;
  checked: number;
  delivered: number;
  skipped: number;
  errors: string[];
}> {
  if (NO_PERSIST) return { at: new Date().toISOString(), checked: 0, delivered: 0, skipped: 1, errors: [] };
  const subscriptions = listBriefingSubscriptions(true);
  const errors: string[] = [];
  let delivered = 0;
  let skipped = 0;
  for (const subscription of subscriptions) {
    const settings = subscription.settings;
    if (!isBriefingDue(settings)) {
      skipped += 1;
      continue;
    }
    const briefing = getOrCreateBriefing(subscription.userId, settings);
    if (settings.externalChannel === "none") {
      skipped += 1;
      continue;
    }
    const existing = getBriefingDeliveryStatus(
      subscription.userId,
      briefing.date,
      settings.externalChannel
    );
    if (existing?.status === "success" && existing.target === deliveryTarget(settings)) {
      skipped += 1;
      continue;
    }
    const result = await deliverBriefing(settings, briefing);
    recordBriefingDelivery({
      userId: subscription.userId,
      date: briefing.date,
      channel: settings.externalChannel,
      status: result.ok ? "success" : "error",
      target: deliveryTarget(settings),
      error: result.reason,
    });
    if (result.ok) delivered += 1;
    else errors.push(`${subscription.userId}:${result.reason}`);
  }
  if (delivered > 0 || errors.length > 0) {
    recordAuditEvent({
      actor: "scheduler",
      action: "briefing.scheduled_delivery",
      entityType: "briefing",
      status: errors.length > 0 ? "error" : "success",
      metadata: { checked: subscriptions.length, delivered, errors: errors.length },
    });
  }
  return {
    at: new Date().toISOString(),
    checked: subscriptions.length,
    delivered,
    skipped,
    errors,
  };
}

export function startBriefingScheduler(): NodeJS.Timeout {
  const timer = setInterval(() => {
    void runScheduledBriefings().catch((error) =>
      console.error("scheduled briefing delivery failed:", error)
    );
  }, BRIEFING_CHECK_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
