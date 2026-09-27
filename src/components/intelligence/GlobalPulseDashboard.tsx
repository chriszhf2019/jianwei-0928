import React, { useMemo } from 'react';
import type { NewsArticle } from '../../types';
import {
  MapPin,
  Globe2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BookOpen,
  CalendarRange,
  ChevronRight,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { articleSortTime, formatArticleTime } from '../../utils/articleTime';
import { SECTOR_TAXONOMY, articleSectors } from '../../utils/sectorTaxonomy';
import { topHotWords, type HotWord } from '../../utils/todayBrief';
import { primaryRegionMention } from '../../utils/regionSemantics';
import { detectMentionRegions } from '../../utils/mentionRegion';
import { regionOf } from '../../utils/sourceRegion';
import { importanceMeta } from '../../utils/importanceRank';
import { buildEventClusters } from '../../utils/eventClusters';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface GlobalPulseDashboardProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  onOpenTermExplain?: (term: string) => void;
}

const DAY = 24 * 60 * 60 * 1000;

function scoreOf(article: NewsArticle): number {
  return article.importance?.score ?? importanceMeta(article).score;
}

function articleText(article: NewsArticle): string {
  return `${article.title || ''} ${article.summary || ''} ${article.subtitle || ''}`.toLowerCase();
}

/** 内容涉事地区：优先 AI 标注，其次词典命中，最后回退到信源所在地。 */
function articleRegions(article: NewsArticle): string[] {
  const aiPrimary = primaryRegionMention(article.regionMentions)?.region;
  if (aiPrimary) return [aiPrimary];
  const mentioned = detectMentionRegions(`${article.title || ''} ${article.summary || ''}`);
  if (mentioned.length > 0) return mentioned.slice(0, 2);
  const sourceRegion = regionOf(article.sourceName);
  return sourceRegion === '未标注' ? ['未标注'] : [sourceRegion];
}

function topArticle(list: NewsArticle[]): NewsArticle | null {
  if (list.length === 0) return null;
  return [...list].sort(
    (a, b) => scoreOf(b) - scoreOf(a) || articleSortTime(b) - articleSortTime(a)
  )[0];
}

interface TrendItem {
  key: string;
  label: string;
  current: number;
  previous: number;
  delta: number;
  pct: number | null;
}

function sectorTrend(current: NewsArticle[], previous: NewsArticle[]): TrendItem[] {
  const count = (pool: NewsArticle[], sectorId: string) =>
    pool.filter((article) => articleSectors(article).includes(sectorId)).length;

  return SECTOR_TAXONOMY.map((sector) => {
    const currentCount = count(current, sector.id);
    const previousCount = count(previous, sector.id);
    if (currentCount === 0 && previousCount === 0) return null;
    const delta = currentCount - previousCount;
    return {
      key: sector.id,
      label: sector.name,
      current: currentCount,
      previous: previousCount,
      delta,
      pct: previousCount > 0 ? Math.round((delta / previousCount) * 100) : null,
    };
  }).filter((item): item is TrendItem => Boolean(item));
}

function regionTrend(current: NewsArticle[], previous: NewsArticle[]): TrendItem[] {
  const counts = (pool: NewsArticle[]) => {
    const map = new Map<string, number>();
    for (const article of pool) {
      for (const region of new Set(articleRegions(article))) {
        map.set(region, (map.get(region) || 0) + 1);
      }
    }
    return map;
  };
  const currentMap = counts(current);
  const previousMap = counts(previous);
  const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  return [...keys]
    .filter((key) => key !== '未标注')
    .map((key) => {
      const currentCount = currentMap.get(key) || 0;
      const previousCount = previousMap.get(key) || 0;
      const delta = currentCount - previousCount;
      return {
        key,
        label: key,
        current: currentCount,
        previous: previousCount,
        delta,
        pct: previousCount > 0 ? Math.round((delta / previousCount) * 100) : null,
      };
    })
    .filter((item) => item.current > 0 || item.previous > 0);
}

function TrendBlock({ title, horizon, current, previous, kind }: {
  title: string;
  horizon: string;
  current: NewsArticle[];
  previous: NewsArticle[];
  kind: 'sector' | 'region';
}) {
  const rows = kind === 'sector' ? sectorTrend(current, previous) : regionTrend(current, previous);
  const max = Math.max(...rows.map((item) => item.current), 1);
  const topRows = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-serif font-black text-stone-900">{title}</h3>
          <p className="text-[11px] text-stone-500 mt-0.5">{horizon}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-stone-100 text-stone-500 font-mono border border-stone-200">
          {kind === 'sector' ? '行业' : '地区'}
        </span>
      </div>

      {topRows.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-400">当前窗口暂无足够样本。</div>
      ) : (
        <div className="space-y-3">
          {topRows.map((item) => {
            const up = item.delta > 0;
            return (
              <div key={`${kind}-${item.key}`}>
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="font-serif font-bold text-stone-800 truncate">{item.label}</span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                    <span className="text-stone-500">{item.previous} → {item.current}</span>
                    <span className={`inline-flex items-center gap-0.5 ${up ? 'text-[#E3120B]' : 'text-emerald-700'}`}>
                      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {item.delta > 0 ? '+' : ''}{item.delta}
                      {item.pct != null ? ` (${item.pct > 0 ? '+' : ''}${item.pct}%)` : ''}
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${up ? 'bg-[#E3120B]' : 'bg-emerald-600'}`}
                    style={{ width: `${Math.max(8, (item.current / max) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const GlobalPulseDashboard: React.FC<GlobalPulseDashboardProps> = ({
  articles,
  onSelectArticle,
  onOpenTermExplain,
}) => {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const timed = useMemo(
    () =>
      articles
        .map((article) => ({ article, time: articleSortTime(article) }))
        .filter((item) => item.time > 0)
        .sort((a, b) => b.time - a.time),
    [articles]
  );

  const todayArticles = timed.filter(
    (item) => item.time >= todayStartMs && item.time < todayStartMs + DAY
  ).map((item) => item.article);
  const last7 = timed.filter((item) => item.time >= now - 7 * DAY).map((item) => item.article);
  const previous7 = timed.filter(
    (item) => item.time >= now - 14 * DAY && item.time < now - 7 * DAY
  ).map((item) => item.article);
  const last30 = timed.filter((item) => item.time >= now - 30 * DAY).map((item) => item.article);
  const previous30 = timed.filter(
    (item) => item.time >= now - 60 * DAY && item.time < now - 30 * DAY
  ).map((item) => item.article);

  // 今天无样本时，用最近 7 天作为“近期脉搏”，避免空白。
  const pulsePool = todayArticles.length > 0 ? todayArticles : last7.slice(0, Math.min(20, last7.length));
  const pulseLabel = todayArticles.length > 0 ? '今日' : '近 7 天';

  const regionRows = useMemo(() => {
    const map = new Map<string, NewsArticle[]>();
    for (const article of pulsePool) {
      for (const region of new Set(articleRegions(article))) {
        const list = map.get(region) || [];
        list.push(article);
        map.set(region, list);
      }
    }
    return [...map.entries()]
      .map(([region, list]) => ({ region, list }))
      .sort((a, b) => b.list.length - a.list.length)
      .slice(0, 8);
  }, [pulsePool]);

  const sectorRows = useMemo(() => {
    return SECTOR_TAXONOMY.map((sector) => {
      const list = pulsePool.filter((article) => articleSectors(article).includes(sector.id));
      return { sector, list };
    })
      .filter((row) => row.list.length > 0)
      .sort((a, b) => b.list.length - a.list.length)
      .slice(0, 8);
  }, [pulsePool]);

  const eventClusters = useMemo(() => buildEventClusters(last7).slice(0, 5), [last7]);

  const hotWords = useMemo(() => {
    const current = topHotWords(last7, 60);
    const previous = new Map(
      topHotWords(previous7, 60).map((item) => [item.word.toLowerCase(), item.count])
    );
    const samples = (word: string) => {
      const lower = word.toLowerCase();
      return last7.find((article) => articleText(article).includes(lower));
    };
    const fresh = current
      .filter((word) => !previous.has(word.word.toLowerCase()) && word.count >= 2)
      .map((word) => ({ word, previousCount: 0, sample: samples(word.word) }))
      .slice(0, 6);
    const rising = current
      .filter((word) => {
        const prev = previous.get(word.word.toLowerCase()) || 0;
        return prev > 0 && word.count > prev;
      })
      .map((word) => ({
        word,
        previousCount: previous.get(word.word.toLowerCase()) || 0,
        sample: samples(word.word),
      }))
      .sort((a, b) => (b.word.count - b.previousCount) - (a.word.count - a.previousCount))
      .slice(0, 6);
    return { fresh, rising };
  }, [last7, previous7]);

  const totalTimed = timed.length;
  const sourceCount = new Set(pulsePool.map((article) => article.sourceName).filter(Boolean)).size;
  const sectorCovered = sectorRows.length;

  return (
    <div className="space-y-6">
      {/* Pulse metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `${pulseLabel}情报`, value: pulsePool.length, note: `全库可追溯 ${totalTimed} 篇` },
          { label: '覆盖地区', value: regionRows.length, note: 'AI 标注优先，词典回退' },
          { label: '覆盖行业', value: sectorCovered, note: `共 ${SECTOR_TAXONOMY.length} 个赛道` },
          { label: '覆盖来源', value: sourceCount, note: '来源数只代表订阅范围' },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-[10px] text-stone-500 font-mono">{item.label}</div>
            <div className="mt-1 text-2xl font-serif font-black text-stone-900">{item.value}</div>
            <div className="mt-1 text-[10px] text-stone-400">{item.note}</div>
          </div>
        ))}
      </div>

      {/* Today: region hotspots */}
      <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe2 className="w-4 h-4 text-[#0284C7]" />
          <h2 className="text-sm font-serif font-black text-stone-900">{pulseLabel} · 全球哪里热</h2>
        </div>
        <p className="text-[11px] text-stone-500 mb-4">
          按内容涉事地区聚合，优先使用 AI 标注，其次词典命中与信源所在地。仅反映当前语料覆盖。
        </p>

        {regionRows.length === 0 ? (
          <div className="py-10 text-center text-xs text-stone-400">暂无可分析的地区信号。</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {regionRows.map(({ region, list }, index) => {
              const lead = topArticle(list);
              const hot = topHotWords(list, 3);
              return (
                <div key={region} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-stone-400">#{index + 1}</div>
                      <div className="mt-0.5 text-sm font-serif font-black text-stone-900">{region}</div>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-[#0284C7] bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
                      {list.length} 条
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {hot.length > 0 ? hot.map((word: HotWord) => (
                      <button
                        key={word.word}
                        type="button"
                        onClick={() => onOpenTermExplain?.(word.word)}
                        className="text-[10px] px-2 py-1 rounded-full bg-white border border-stone-200 text-stone-700 hover:border-[#0284C7] hover:text-[#0284C7]"
                        title={`该地区出现 ${word.count} 篇`}
                      >
                        {word.word} {word.count}
                      </button>
                    )) : <span className="text-[10px] text-stone-400">暂无热词</span>}
                  </div>
                  {lead && (
                    <button
                      type="button"
                      onClick={() => onSelectArticle(lead)}
                      className="mt-3 w-full text-left text-[11px] leading-relaxed text-stone-700 line-clamp-3 hover:text-[#E3120B]"
                    >
                      {lead.title}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Today: industry hotspots */}
      <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-[#E3120B]" />
          <h2 className="text-sm font-serif font-black text-stone-900">{pulseLabel} · 哪些行业热</h2>
        </div>
        <p className="text-[11px] text-stone-500 mb-4">
          赛道关键词命中计数，展示当前语料中的行业供给集中度，不代表现实产业权重。
        </p>

        {sectorRows.length === 0 ? (
          <div className="py-10 text-center text-xs text-stone-400">暂未命中行业关键词。</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sectorRows.map(({ sector, list }, index) => {
              const lead = topArticle(list);
              const maxCount = Math.max(...sectorRows.map((row) => row.list.length), 1);
              return (
                <div key={sector.id} className="rounded-xl border border-stone-200 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-[10px]">
                        {index + 1}
                      </span>
                      <span className="text-sm font-serif font-black text-stone-900">{sector.name}</span>
                    </div>
                    <span className="text-xs font-mono text-[#E3120B]">{list.length} 篇</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-[#E3120B] rounded-full"
                      style={{ width: `${(list.length / maxCount) * 100}%` }}
                    />
                  </div>
                  {lead && (
                    <button
                      type="button"
                      onClick={() => onSelectArticle(lead)}
                      className="w-full text-left text-[11px] leading-relaxed text-stone-700 line-clamp-2 hover:text-[#E3120B]"
                    >
                      {lead.title}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Weekly / monthly changes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-serif font-black text-stone-900">最近一周 / 一个月，什么在升温</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrendBlock title="近 7 天变化" horizon="本周 vs 前 7 天" current={last7} previous={previous7} kind="sector" />
          <TrendBlock title="近 30 天变化" horizon="本月 vs 前 30 天" current={last30} previous={previous30} kind="sector" />
          <TrendBlock title="近 7 天地区变化" horizon="本周 vs 前 7 天" current={last7} previous={previous7} kind="region" />
          <TrendBlock title="近 30 天地区变化" horizon="本月 vs 前 30 天" current={last30} previous={previous30} kind="region" />
        </div>
      </section>

      {/* Main events & background */}
      <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-serif font-black text-stone-900">近 7 天主线事件 · 发生了什么</h2>
        </div>
        <p className="text-[11px] text-stone-500 mb-4">
          同一事件合并不同来源，先看事实摘要，再看它为什么重要。多源不代表内容为真。
        </p>

        {eventClusters.length === 0 ? (
          <div className="py-10 text-center text-xs text-stone-400">当前窗口暂无足够的事件节点。</div>
        ) : (
          <div className="divide-y divide-stone-100 border-t border-stone-100">
            {eventClusters.map((cluster) => {
              const lead = cluster.lead;
              return (
                <button
                  key={cluster.id}
                  type="button"
                  onClick={() => onSelectArticle(lead)}
                  className="w-full flex items-start gap-3 py-3 text-left group"
                >
                  <span className="mt-1 w-6 shrink-0 h-6 rounded-md bg-stone-900 text-white flex items-center justify-center font-mono text-[11px] font-black">
                    {Math.round(cluster.score)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-serif font-bold text-stone-900 leading-snug group-hover:text-[#E3120B]">
                      {lead.title}
                    </span>
                    {lead.summary && lead.summary !== lead.title && (
                      <span className="mt-1 block text-[11px] leading-relaxed text-stone-600 line-clamp-2">
                        <KeyTermHighlight
                          text={lead.summary}
                          entities={(lead.entityMentions || []).map((entity) => entity.name)}
                        />
                      </span>
                    )}
                    {lead.oneSentenceVerdict && lead.oneSentenceVerdict !== lead.summary && (
                      <span className="mt-1 block text-[11px] leading-relaxed text-stone-500 line-clamp-2">
                        <span className="font-serif font-bold text-stone-600">背景 · </span>
                        {lead.oneSentenceVerdict}
                      </span>
                    )}
                    <span className="mt-1 block text-[10px] text-stone-400">
                      {cluster.sourceNames.slice(0, 3).join(' · ')}
                      {cluster.sourceNames.length > 3 ? ` 等 ${cluster.sourceNames.length} 家` : ''}
                      {lead.publishedAt || lead.sourceDate || lead.date
                        ? ` · ${formatArticleTime(lead)}`
                        : ''}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-[#E3120B] shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* New hot words */}
      <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#E3120B]" />
          <h2 className="text-sm font-serif font-black text-stone-900">新热词与升温词</h2>
        </div>
        <p className="text-[11px] text-stone-500 mb-4">
          近 7 天首次出现或较前 7 天明显增多的关键词。点击词可查看解释。
        </p>

        {(hotWords.fresh.length === 0 && hotWords.rising.length === 0) ? (
          <div className="py-10 text-center text-xs text-stone-400">暂无明显新词或升温词。</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...hotWords.fresh, ...hotWords.rising].slice(0, 9).map(({ word, previousCount, sample }) => (
              <button
                key={word.word}
                type="button"
                onClick={() => onOpenTermExplain?.(word.word)}
                className="text-left rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 hover:border-[#E3120B] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-serif font-black text-stone-900">{word.word}</span>
                  <span className="text-[10px] font-mono text-[#E3120B] bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                    {previousCount === 0 ? '新词' : `+${word.count - previousCount}`}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-stone-600 line-clamp-2">
                  {previousCount === 0
                    ? `近 7 天出现 ${word.count} 篇，前 7 天未出现。`
                    : `近 7 天 ${word.count} 篇，较前 7 天 ${previousCount} 篇上升。`}
                </div>
                {sample && (
                  <div className="mt-2 text-[10px] text-stone-400 line-clamp-2">来自：{sample.title}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 text-[10px] text-stone-400">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          以上统计均来自当前运行时语料，地区与行业为可复核的词典/AI 标注口径，不构成全网事实真值或预测。
        </span>
      </div>
    </div>
  );
};
