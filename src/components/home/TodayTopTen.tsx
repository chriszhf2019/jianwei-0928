import { useMemo, useState } from 'react';
import type { NewsArticle } from '../../types';
import type { RankedArticleMeta } from '../../utils/importanceRank';
import { articleSectors, SECTOR_TAXONOMY } from '../../utils/sectorTaxonomy';
import { formatArticleTime } from '../../utils/articleTime';
import { sevenElementsPlain } from '../../utils/plainSummary';
import { authorityMeta } from '../../utils/importanceRank';
import { buildEventClusters } from '../../utils/eventClusters';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { Trophy, Globe, Layers, ShieldCheck } from 'lucide-react';

type TopTenMode = 'global' | 'sector' | 'authority';

interface TodayTopTenProps {
  articles: NewsArticle[];
  importanceById: Map<string, RankedArticleMeta>;
  timeHorizon: 'today' | 'all';
  onSelectArticle: (article: NewsArticle) => void;
}

const HORIZON_LABEL: Record<TodayTopTenProps['timeHorizon'], string> = {
  today: '今日',
  all: '全部',
};

/** 一条客观速览：优先原文摘要/导语，其次七要素「发生了什么」的人话版。 */
function plainLead(article: NewsArticle): string {
  const candidate = (article.summary || article.subtitle || '').trim();
  if (candidate) return candidate;
  return sevenElementsPlain(article);
}

export function TodayTopTen({ articles, importanceById, timeHorizon, onSelectArticle }: TodayTopTenProps) {
  const [mode, setMode] = useState<TopTenMode>('global');

  const ranked = useMemo(
    () =>
      articles
        .map((article) => {
          const meta = importanceById.get(article.id);
          return { article, score: meta?.score ?? 0, reasons: meta?.reasons ?? [] };
        })
        .sort((a, b) => b.score - a.score),
    [articles, importanceById]
  );

  const globalTop = useMemo(() => buildEventClusters(articles).slice(0, 10), [articles]);
  const authorityTop = useMemo(
    () =>
      articles
        .map((article) => ({ article, meta: authorityMeta(article) }))
        .sort((a, b) => b.meta.score - a.meta.score)
        .slice(0, 10),
    [articles]
  );
  const sectorGroups = useMemo(
    () => {
      const sectorsById = new Map<string, string[]>();
      for (const article of articles) sectorsById.set(article.id, articleSectors(article));
      return SECTOR_TAXONOMY.map((sector) => ({
        sector,
        items: ranked.filter(({ article }) => (sectorsById.get(article.id) || []).includes(sector.id)).slice(0, 10),
      }))
        .filter((group) => group.items.length > 0)
        .sort((a, b) => b.items[0].score - a.items[0].score);
    },
    [articles, ranked]
  );

  if (globalTop.length === 0 && ranked.length === 0) return null;

  const label = HORIZON_LABEL[timeHorizon] || '今日';

  return (
    <section className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#E3120B]" />
          <h2 className="text-sm font-serif font-black text-stone-900">{label}焦点 · Top 10</h2>
        </div>
      <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
          <button
            onClick={() => setMode('global')}
            className={`px-2.5 py-1 rounded-md text-xs font-serif font-bold inline-flex items-center gap-1 transition-all ${mode === 'global' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
          >
            <Globe className="w-3 h-3" /> 全球
          </button>
          <button
            onClick={() => setMode('sector')}
            className={`px-2.5 py-1 rounded-md text-xs font-serif font-bold inline-flex items-center gap-1 transition-all ${mode === 'sector' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
          >
            <Layers className="w-3 h-3" /> 行业
          </button>
          <button
            onClick={() => setMode('authority')}
            className={`px-2.5 py-1 rounded-md text-xs font-serif font-bold inline-flex items-center gap-1 transition-all ${mode === 'authority' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
          >
            <ShieldCheck className="w-3 h-3" /> 权威
          </button>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 mb-3">
        {mode === 'authority'
          ? '权威度 = 来源等级 50% + 多源印证 35% + 可追溯证据 15%；这是信誉与交叉印证信号，不是真假裁定。'
          : '同题报道先合并成一个事件节点，再按事件本身的重要度排序，不是社交热度：严重度 40% + 覆盖面 30% + 影响范围 30%。来源权威与多源印证不改变排名，只在节点中标注证据状态。'}
      </p>

      {mode === 'global' && (
        <ol className="divide-y divide-stone-100 border-t border-stone-100">
          {globalTop.map(({ lead, score, sourceNames }, index) => (
            <li key={lead.id}>
              <button
                onClick={() => onSelectArticle(lead)}
                className="w-full flex items-start gap-3 py-2.5 text-left group"
              >
                <span className="font-mono text-sm font-black text-stone-300 w-6 shrink-0 mt-0.5 group-hover:text-[#E3120B]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-serif font-bold text-stone-900 leading-snug group-hover:text-[#E3120B] transition-colors line-clamp-2">
                    {lead.title}
                  </span>
                  {plainLead(lead) && (
                    <span className="block mt-1 text-[11px] text-stone-500 leading-snug line-clamp-2">
                      {plainLead(lead)}
                    </span>
                  )}
                  <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-stone-500">
                    <EvidenceBadge article={lead} corpus={articles} compact />
                    <span>
                      {sourceNames.length <= 1
                        ? lead.sourceName || '外部信源'
                        : `${sourceNames.slice(0, 3).join(' · ')}${sourceNames.length > 3 ? ` 等 ${sourceNames.length} 家` : ''}`}
                    </span>
                    <span>· {formatArticleTime(lead)}</span>
                  </span>
                </span>
                <span className="font-mono text-xs font-black text-[#E3120B] shrink-0 mt-0.5" title={`重要度 ${score}/100`}>
                  {score}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {mode === 'sector' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectorGroups.map(({ sector, items }) => (
            <div key={sector.id} className="border border-stone-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-100">
                <span className="text-xs font-serif font-black text-stone-800">{sector.name}</span>
                <span className="font-mono text-[10px] text-stone-400">{items.length} 条</span>
              </div>
              <ol className="space-y-1.5">
                {items.map(({ article, score }, i) => (
                  <li key={article.id}>
                    <button onClick={() => onSelectArticle(article)} className="w-full flex items-center gap-2 text-left group">
                      <span className="font-mono text-[11px] text-stone-400 w-4 shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs text-stone-700 leading-snug line-clamp-1 group-hover:text-[#E3120B]">
                          {article.title}
                        </span>
                        {plainLead(article) && (
                          <span className="block mt-0.5 text-[10px] text-stone-400 leading-snug line-clamp-1">
                            {plainLead(article)}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-stone-400 shrink-0">{score}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {mode === 'authority' && (
        <ol className="divide-y divide-stone-100 border-t border-stone-100">
          {authorityTop.map(({ article, meta }, index) => (
            <li key={article.id}>
              <button
                onClick={() => onSelectArticle(article)}
                className="w-full flex items-start gap-3 py-2.5 text-left group"
              >
                <span className="font-mono text-sm font-black text-stone-300 w-6 shrink-0 mt-0.5 group-hover:text-[#E3120B]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-serif font-bold text-stone-900 leading-snug group-hover:text-[#E3120B] transition-colors line-clamp-2">
                    {article.title}
                  </span>
                  {plainLead(article) && (
                    <span className="block mt-1 text-[11px] text-stone-500 leading-snug line-clamp-2">
                      {plainLead(article)}
                    </span>
                  )}
                  <span className="block mt-1 text-[11px] text-stone-500">
                    {article.sourceName || '外部信源'} · {formatArticleTime(article)}
                    {meta.reasons[0] ? ` · ${meta.reasons[0]}` : ''}
                  </span>
                </span>
                <span
                  className="font-mono text-xs font-black text-emerald-700 shrink-0 mt-0.5"
                  title={`权威度 ${meta.score}/100（来源 ${meta.parts.source} · 印证 ${meta.parts.corroboration} · 证据 ${meta.parts.evidence}）`}
                >
                  {meta.score}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
