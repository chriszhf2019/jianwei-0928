import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { buildEvidenceProfile, buildSimilarityIndex, type EvidenceProfile } from './evidenceProfile';
import { importanceMeta, type RankedArticleMeta } from './importanceRank';
import { mediaProfile } from './mediaAuthority';
import { sourceGroupInfo, sourceGroupKeyForArticle } from './sourceGrouping';

export interface EventCluster {
  id: string;
  /** 作为该事件展示入口的代表文章：取事件内重要度最高者，重要度相同则取最新。 */
  lead: NewsArticle;
  members: NewsArticle[];
  importance: RankedArticleMeta;
  evidence: EvidenceProfile;
  score: number;
  independentSources: number;
  sourceNames: string[];
  latestAt: number;
}

interface ClusterOptions {
  similarityThreshold?: number;
  timeWindowDays?: number;
}

function timeClose(a: NewsArticle, b: NewsArticle, windowMs: number): boolean {
  const at = articleSortTime(a);
  const bt = articleSortTime(b);
  if (!at || !bt) return true;
  return Math.abs(at - bt) <= windowMs;
}

function displaySourceName(item: {
  sourceName?: string | null;
  sourceUrl?: string | null;
}): string {
  const profile = mediaProfile(item.sourceName, item.sourceUrl);
  if (profile) return profile.displayName;
  const group = sourceGroupInfo(item.sourceName, item.sourceUrl);
  if (group.known) return group.label;
  return String(item.sourceName || '').replace(/^www\./, '') || '外部信源';
}

/**
 * 把同一事件的不同报道合并成一个事件节点。
 *
 * 这里只做“标题事件相似 + 时间窗”聚类，不把来源权威或媒体热度当作事件重要度。
 * 聚类目的是避免同一事件被不同媒体重复展示，并统计独立来源数和证据状态。
 */
export function buildEventClusters(
  articles: NewsArticle[],
  options: ClusterOptions = {}
): EventCluster[] {
  const similarityThreshold = options.similarityThreshold ?? 0.46;
  const timeWindowMs = (options.timeWindowDays ?? 7) * 24 * 60 * 60 * 1000;
  const pool = [...articles].sort((a, b) => articleSortTime(b) - articleSortTime(a));
  const similarityIndex = buildSimilarityIndex(articles, similarityThreshold);

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let current = id;
    while (parent.get(current) !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const article of pool) {
    for (const match of similarityIndex.get(String(article.id)) || []) {
      if (!timeClose(article, match.article, timeWindowMs)) continue;
      union(article.id, match.article.id);
    }
  }

  const groups = new Map<string, NewsArticle[]>();
  for (const article of pool) {
    const root = find(article.id);
    const group = groups.get(root);
    if (group) group.push(article);
    else groups.set(root, [article]);
  }

  return [...groups.values()]
    .map((members) => {
      const sortedMembers = members.sort((a, b) => {
        const ai = importanceMeta(a).score;
        const bi = importanceMeta(b).score;
        return bi - ai || articleSortTime(b) - articleSortTime(a);
      });
      const lead = sortedMembers[0];
      const importance = importanceMeta(lead);

      const sourceKeys = new Set<string>();
      const sourceNames = new Set<string>();
      for (const member of members) {
        const key = sourceGroupKeyForArticle(member);
        if (key && key !== 'unknown-source') sourceKeys.add(key);
        sourceNames.add(displaySourceName(member));
        for (const occurrence of member.sourceOccurrences || []) {
          const occurrenceKey = sourceGroupKeyForArticle(occurrence);
          if (occurrenceKey && occurrenceKey !== 'unknown-source') sourceKeys.add(occurrenceKey);
          sourceNames.add(displaySourceName(occurrence));
        }
      }

      const evidence = buildEvidenceProfile(lead, articles, similarityThreshold, similarityIndex);
      return {
        id: `event:${[...members.map((item) => item.id)].sort().join('|')}`,
        lead,
        members: sortedMembers,
        importance,
        evidence,
        score: importance.score,
        independentSources: Math.max(1, sourceKeys.size),
        sourceNames: [...sourceNames],
        latestAt: articleSortTime(lead),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.latestAt - a.latestAt ||
        b.independentSources - a.independentSources
    );
}
