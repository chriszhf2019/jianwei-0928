import type {
  BriefingItem,
  BriefingPredictionItem,
  BriefingSettings,
  MorningBriefing,
  NewsArticle,
  PredictionContract,
  RadarKeyword,
  UserPersonaId,
} from '../types';
import { USER_PERSONAS } from '../data/intelligenceData';
import { parseArticleDate } from './articleTime';
import { monitorHits } from './monitorKeywords';
import { predictionDueInfo } from './predictionLedger';
import { detectSectors, keywordMatches, SECTOR_TAXONOMY } from './sectorTaxonomy';

const BRIEFING_WINDOW_HOURS = 36;

function textOf(article: NewsArticle): string {
  return [
    article.title,
    article.subtitle,
    article.summary,
    article.oneSentenceVerdict,
    ...(article.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function articleTime(article: NewsArticle): number {
  return parseArticleDate(article.publishedAt || article.sourceDate || article.date) ?? 0;
}

function uniqueArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = String(article.id || article.sourceUrl || article.title || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function personaMatch(article: NewsArticle, personaId: UserPersonaId): boolean {
  if (article.personaImpacts?.some((item) => item.personaId === personaId)) return true;
  const persona = USER_PERSONAS.find((item) => item.id === personaId);
  if (!persona) return false;
  const text = textOf(article);
  return persona.focusKeywords.some((keyword) => keywordMatches(text, keyword));
}

function reasonFor(article: NewsArticle, settings: BriefingSettings, radarWords: string[]): string {
  const reasons: string[] = [];
  if (article.sourceCount > 1 || (article.sourceOccurrences?.length || 0) > 1) {
    reasons.push(`${Math.max(article.sourceCount || 1, article.sourceOccurrences?.length || 1)} 个来源`);
  }
  if (radarWords.length > 0) reasons.push(`命中监控词「${radarWords.slice(0, 2).join('、')}」`);
  if (personaMatch(article, settings.personaId)) {
    const persona = USER_PERSONAS.find((item) => item.id === settings.personaId);
    reasons.push(`与${persona?.name || '当前身份'}相关`);
  }
  const sectors = detectSectors(article)
    .map((id) => SECTOR_TAXONOMY.find((sector) => sector.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);
  if (sectors.length > 0) reasons.push(`${sectors.join('、')}赛道`);
  return reasons.length > 0 ? reasons.join(' · ') : '近期新增报道';
}

export function briefingClock(date: Date, timeZone: string): { date: string; time: string } {
  const zone = String(timeZone || 'Asia/Shanghai');
  let parts: ReturnType<Intl.DateTimeFormat['formatToParts']>;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
  }
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

export function isBriefingDue(settings: BriefingSettings, now = new Date()): boolean {
  if (!settings.enabled) return false;
  const clock = briefingClock(now, settings.timezone);
  return clock.time >= settings.displayAfter;
}

export function buildMorningBriefing(input: {
  userId: string;
  articles: NewsArticle[];
  settings: BriefingSettings;
  predictions?: PredictionContract[];
  radarKeywords?: RadarKeyword[];
  now?: Date;
}): MorningBriefing {
  const now = input.now || new Date();
  const clock = briefingClock(now, input.settings.timezone);
  const cutoff = now.getTime() - BRIEFING_WINDOW_HOURS * 60 * 60 * 1000;
  const candidates = uniqueArticles(input.articles)
    .filter((article) => {
      const timestamp = articleTime(article);
      return timestamp === 0 || timestamp >= cutoff;
    })
    .slice(0, 250);
  const radarKeywords = input.radarKeywords || [];

  const ranked = candidates
    .map((article) => {
      const hits = monitorHits(article, radarKeywords);
      const relevant = personaMatch(article, input.settings.personaId);
      const sources = Math.max(article.sourceCount || 1, article.sourceOccurrences?.length || 1);
      const sectorCount = detectSectors(article).length;
      const ageHours = Math.max(0, (now.getTime() - articleTime(article)) / 3_600_000);
      const recency = Number.isFinite(ageHours) ? Math.max(0, 12 - ageHours / 3) : 0;
      const score =
        sources * 8 +
        (relevant ? 16 : 0) +
        hits.length * 12 +
        sectorCount * 3 +
        recency;
      return {
        article,
        hits: hits.map((item) => item.keyword),
        score,
        relevant,
      };
    })
    .sort((a, b) => b.score - a.score || articleTime(b.article) - articleTime(a.article));

  const toItem = (entry: (typeof ranked)[number]): BriefingItem => ({
    articleId: entry.article.id,
    title: entry.article.title,
    sourceName: entry.article.sourceName || '来源未标',
    publishedAt: entry.article.publishedAt || entry.article.sourceDate,
    reason: reasonFor(entry.article, input.settings, entry.hits),
    score: Math.round(entry.score * 10) / 10,
  });

  const keyChanges = ranked.slice(0, 5).map(toItem);
  const relevantToYou = ranked
    .filter((entry) => entry.relevant)
    .slice(0, 4)
    .map(toItem);
  const radarHits = ranked
    .filter((entry) => entry.hits.length > 0)
    .slice(0, 4)
    .map(toItem);

  const predictionsDue: BriefingPredictionItem[] = (input.predictions || [])
    .filter((contract) => contract.status === 'pending')
    .map((contract) => ({
      contract,
      due: predictionDueInfo(contract.targetVerificationDate, contract.status, now),
    }))
    .filter(({ due }) =>
      ['overdue', 'due_today', 'due_soon'].includes(due.state)
    )
    .sort((a, b) => a.due.daysUntilDue! - b.due.daysUntilDue!)
    .slice(0, 4)
    .map(({ contract, due }) => ({
      contractId: contract.id,
      question: contract.question,
      dueLabel: due.label,
      targetVerificationDate: contract.targetVerificationDate,
    }));

  const sectorCounts = new Map<string, number>();
  for (const entry of ranked) {
    for (const sectorId of detectSectors(entry.article)) {
      sectorCounts.set(sectorId, (sectorCounts.get(sectorId) || 0) + 1);
    }
  }
  const watchNext = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => SECTOR_TAXONOMY.find((sector) => sector.id === id)?.name)
    .filter((value): value is string => Boolean(value));

  const sourceCount = new Set(candidates.map((article) => article.sourceName).filter(Boolean)).size;
  const strongestReason = keyChanges[0]?.reason;
  const summaryParts = [
    `过去 ${BRIEFING_WINDOW_HOURS} 小时，语料中可核验到 ${candidates.length} 篇报道，覆盖 ${sourceCount} 个来源。`,
  ];
  if (watchNext.length > 0) summaryParts.push(`当前报道较集中的赛道是${watchNext.slice(0, 3).join('、')}。`);
  if (strongestReason) summaryParts.push(`首要关注：${strongestReason}。`);
  if (predictionsDue.length > 0) summaryParts.push(`另有 ${predictionsDue.length} 条预测契约进入复核窗口。`);

  return {
    id: `briefing-${input.userId}-${clock.date}`,
    userId: input.userId,
    date: clock.date,
    personaId: input.settings.personaId,
    title: `今日晨报 · ${keyChanges.length > 0 ? `${keyChanges.length} 个值得关注的变化` : '暂无重大变化'}`,
    summary: summaryParts.join(''),
    generatedAt: now.toISOString(),
    readAt: null,
    articleCount: candidates.length,
    sourceCount,
    keyChanges,
    relevantToYou,
    radarHits,
    predictionsDue,
    watchNext,
  };
}
