// “全球重要度”排序工具：完全透明的可解释代理，不是社交平台热度，也不是 AI 评分。
// 重要度只看事件本身（量级/覆盖面/影响范围），来源权威与多源印证单独作为可信度，
// 不再混进重要度分数。个人相关性由 relevanceRank 单独计算。

import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { mediaProfile } from './mediaAuthority';
import { primarySourceKind, primarySourceLabel } from './primarySource';
import { detectSectors } from './sectorTaxonomy';
import { sourceGroupKeyForArticle } from './sourceGrouping';
import { breakingSignalOf } from './todayBrief';

export interface RankedArticleMeta {
  score: number;
  credibility: number;
  reasons: string[];
  credibilityReasons: string[];
  parts: {
    severity: number;
    breadth: number;
    scope: number;
    credibility: number;
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function authoritySignal(article: NewsArticle): { score: number; reason: string } {
  const profile = mediaProfile(article.sourceName, article.sourceUrl);
  if (!profile?.tier) return { score: 25, reason: '来源未收录' };
  if (profile.tier === 'A') return { score: 100, reason: '权威信源 A 级' };
  if (profile.tier === 'B') return { score: 72, reason: '行业信源 B 级' };
  return { score: 45, reason: '消费信源 C 级' };
}

function corroborationSignal(article: NewsArticle): { score: number; reason: string } {
  const groups = new Set<string>();
  const addGroup = (item: {
    title?: string | null;
    subtitle?: string | null;
    summary?: string | null;
    sourceName?: string | null;
    sourceUrl?: string | null;
  }) => {
    const key = sourceGroupKeyForArticle(item);
    if (key && key !== 'unknown-source') groups.add(key);
  };
  addGroup(article);
  for (const occurrence of article.sourceOccurrences || []) addGroup(occurrence);
  const count = Math.max(1, groups.size);
  const score = count >= 4 ? 100 : count === 3 ? 82 : count === 2 ? 62 : 30;
  return { score, reason: count > 1 ? `${count} 家独立来源印证` : '单一来源' };
}

function severitySignal(article: NewsArticle): { score: number; reason: string } {
  const signal = breakingSignalOf(article.title);
  if (signal.level === 'strong') return { score: 100, reason: `重大事件词「${signal.word}」` };
  if (signal.level === 'weak') return { score: 55, reason: `风险事件词「${signal.word}」` };
  return { score: 15, reason: '常规动态' };
}

function scopeSignal(article: NewsArticle): { score: number; reason: string } {
  const scope = String(article.impactScope || '').trim();
  if (scope === '全球') return { score: 100, reason: '全球性影响' };
  if (scope === '区域') return { score: 70, reason: '区域性影响' };
  if (scope === '特定行业') return { score: 45, reason: '特定行业影响' };
  if (scope === '本地') return { score: 25, reason: '本地影响' };
  return { score: 40, reason: '影响范围未标注' };
}

function breadthSignal(article: NewsArticle): { score: number; reason: string } {
  const entityCount = (article.entityMentions || []).length;
  const sectorCount = detectSectors(article).length;
  if (entityCount > 0) {
    const score = entityCount >= 3 ? 100 : entityCount === 2 ? 75 : 55;
    return { score, reason: `涉及 ${entityCount} 个主体` };
  }
  if (sectorCount > 0) {
    const score = sectorCount >= 3 ? 82 : sectorCount === 2 ? 58 : 38;
    return { score, reason: `覆盖 ${sectorCount} 个赛道` };
  }
  return { score: 10, reason: '暂无主体/赛道标注' };
}

/** 返回单篇的重要度分值（0-100）与入选理由（按权重排序）。 */
export function importanceMeta(article: NewsArticle): RankedArticleMeta {
  const authority = authoritySignal(article);
  const corroboration = corroborationSignal(article);
  const severity = severitySignal(article);
  const breadth = breadthSignal(article);
  const scope = scopeSignal(article);

  const credibility = clamp(authority.score * 0.55 + corroboration.score * 0.45);
  const score = clamp(severity.score * 0.4 + breadth.score * 0.3 + scope.score * 0.3);

  return {
    score,
    credibility,
    reasons: [severity.reason, breadth.reason, scope.reason],
    credibilityReasons: [authority.reason, corroboration.reason],
    parts: {
      severity: severity.score,
      breadth: breadth.score,
      scope: scope.score,
      credibility,
    },
  };
}

export interface RankedArticle {
  article: NewsArticle;
  score: number;
  reasons: string[];
}

export interface AuthorityMeta {
  /** 权威度 0-100：来源等级 50% + 多源印证 35% + 可追溯证据 15%，非真假分。 */
  score: number;
  reasons: string[];
  parts: {
    source: number;
    corroboration: number;
    evidence: number;
  };
}

/** 可追溯证据：引句核验 + 官方/一手来源 + 原文链接 + 真实时间，四者都是可复核口径。 */
function evidenceSignal(article: NewsArticle): { score: number; reason: string } {
  const hasLink = Boolean(article.sourceUrl);
  const hasTime = articleSortTime(article) > 0;
  const primary = primarySourceKind(article.sourceName, article.sourceUrl);
  const verifiedQuotes = (article.evidenceChain || []).filter(
    (item) => item.verificationStatus === 'linked'
  ).length;
  const bits: string[] = [];
  let score = 0;
  if (verifiedQuotes > 0) {
    score += 35;
    bits.push(`引句已核验${verifiedQuotes > 1 ? ` ${verifiedQuotes} 条` : ''}`);
  }
  if (primary) { score += 25; bits.push(primarySourceLabel(primary)); }
  if (hasLink) { score += 20; bits.push('有原文链接'); }
  if (hasTime) { score += 20; bits.push('有真实时间'); }
  if (bits.length === 0) return { score: 0, reason: '缺少可追溯原文' };
  return { score: Math.min(100, score), reason: bits.join(' · ') };
}

/** 权威度：来源等级 + 多源印证 + 可追溯证据，三个信号都是可复核口径，不是模型打分。 */
export function authorityMeta(article: NewsArticle): AuthorityMeta {
  const source = authoritySignal(article);
  const corroboration = corroborationSignal(article);
  const evidence = evidenceSignal(article);
  const score = clamp(source.score * 0.5 + corroboration.score * 0.35 + evidence.score * 0.15);
  return {
    score,
    reasons: [source.reason, corroboration.reason, evidence.reason],
    parts: {
      source: source.score,
      corroboration: corroboration.score,
      evidence: evidence.score,
    },
  };
}

/** 对一批文章按重要度降序排列；同分时按真实发布时间新到旧。 */
export function rankArticles(articles: NewsArticle[]): RankedArticle[] {
  return articles
    .map((article) => {
      const meta = importanceMeta(article);
      return { article, score: meta.score, reasons: meta.reasons };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        articleSortTime(b.article) - articleSortTime(a.article)
    );
}
