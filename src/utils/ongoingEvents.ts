import type { NewsArticle } from '../types';
import { articleSortTime, formatArticleTime, formatDateOnly } from './articleTime';
import { buildEventClusters, type EventCluster } from './eventClusters';

export interface OngoingEvent {
  id: string;
  cluster: EventCluster;
  first: NewsArticle;
  latest: NewsArticle;
  memberCount: number;
  sourceCount: number;
  distinctDays: number;
  hasTodayUpdate: boolean;
  daySpanLabel: string;
  firstLabel: string;
  latestLabel: string;
  score: number;
}

function timeOf(article: NewsArticle): number {
  return articleSortTime(article);
}

function dayKey(timestamp: number): string {
  return formatDateOnly(timestamp);
}

export interface OngoingEventOptions {
  /** 追踪窗口：以今天为起点向前看多少天。默认 7。 */
  recentDays?: number;
  /** 最多展示多少个事件。默认 5。 */
  limit?: number;
  /** 一个事件至少需要多少篇报道才算“仍在发展”。默认 2。 */
  requireUpdates?: number;
}

/**
 * 从近期语料中识别“仍在发展的事件”。
 *
 * 逻辑不是按单篇文章热度排名，而是先做同题聚类，再看一个事件是否在多个日期有
 * 连续报道：这表示事件仍在推进，值得被用户持续跟进。今天有更新的事件优先展示。
 */
export function buildOngoingEvents(
  articles: NewsArticle[],
  options: OngoingEventOptions = {}
): OngoingEvent[] {
  const recentDays = options.recentDays ?? 7;
  const limit = options.limit ?? 5;
  const requireUpdates = options.requireUpdates ?? 2;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cutoff = dayStart - (recentDays - 1) * 24 * 60 * 60 * 1000;
  const nextDay = dayStart + 24 * 60 * 60 * 1000;

  const pool = articles.filter((article) => {
    const timestamp = timeOf(article);
    return timestamp >= cutoff && timestamp < nextDay;
  });

  const clusters = buildEventClusters(pool, {
    similarityThreshold: 0.46,
    timeWindowDays: recentDays,
  }).filter((cluster) => cluster.members.length >= requireUpdates);

  return clusters
    .map((cluster) => {
      const members = [...cluster.members].sort((a, b) => timeOf(a) - timeOf(b));
      const first = members[0];
      const latest = members[members.length - 1];
      const distinctDays = new Set(
        members.map((member) => dayKey(timeOf(member))).filter(Boolean)
      ).size;
      const hasTodayUpdate = members.some((member) => {
        const timestamp = timeOf(member);
        return timestamp >= dayStart && timestamp < nextDay;
      });

      return {
        id: `ongoing:${cluster.id}`,
        cluster,
        first,
        latest,
        memberCount: members.length,
        sourceCount: cluster.independentSources,
        distinctDays,
        hasTodayUpdate,
        daySpanLabel:
          distinctDays <= 1 ? '今日集中报道' : `连续 ${distinctDays} 天`,
        firstLabel: `${formatDateOnly(timeOf(first))} · ${formatArticleTime(first)}`,
        latestLabel: `${formatDateOnly(timeOf(latest))} · ${formatArticleTime(latest)}`,
        score: cluster.score,
      };
    })
    .sort(
      (a, b) =>
        Number(b.hasTodayUpdate) - Number(a.hasTodayUpdate) ||
        b.score - a.score ||
        timeOf(b.latest) - timeOf(a.latest)
    )
    .slice(0, limit);
}
