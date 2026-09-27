import React, { useState } from 'react';
import { NewsArticle } from '../../types';
import { ArrowRight, Bookmark, Radio, ExternalLink, Share2, Check } from 'lucide-react';
import { formatArticleTime, isStaleArticle } from '../../utils/articleTime';
import { monitorHits } from '../../utils/monitorKeywords';
import { POSITIVE_WORDS, NEGATIVE_WORDS } from '../../utils/corpusMetrics';
import { SECTOR_TAXONOMY, detectSectors, keywordMatches } from '../../utils/sectorTaxonomy';
import { mediaProfile, tierBadge } from '../../utils/mediaAuthority';
import { primarySourceKind, primarySourceLabel } from '../../utils/primarySource';
import { sourceCategoryLabel } from '../../data/sourceDirectory';
import { CardInsightBox } from './CardInsightBox';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import { EvidenceBadge } from '../common/EvidenceBadge';
import type { RadarKeyword } from '../../types';
import type { NewsSkill } from './HomeView';
import type { RankedArticleMeta, AuthorityMeta } from '../../utils/importanceRank';
import type { RelevanceMeta } from '../../utils/relevanceRank';

/** 逐篇情绪：对标题+摘要做财经情感词典命中 → 偏正面/偏负面/中性（词典口径，非 AI） */
function articleSentiment(article: { title?: string; summary?: string }): string {
  const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE_WORDS) if (text.includes(w.toLowerCase())) pos += 1;
  for (const w of NEGATIVE_WORDS) if (text.includes(w.toLowerCase())) neg += 1;
  if (pos === 0 && neg === 0) return '⚪ 中性';
  return pos > neg ? '🟢 偏正面' : neg > pos ? '🔴 偏负面' : '🟡 多空交织';
}

/** 标签派生：真实 tags ∪ 命中监控词 ∪ 赛道命中（无 tags 的外部新闻也有可读标签） */
function cardTags(article: NewsArticle, hits: Array<{ keyword: string }>): Array<{ label: string; isReal: boolean }> {
  const out: Array<{ label: string; isReal: boolean }> = [];
  const seen = new Set<string>();
  const push = (label: string, isReal: boolean) => {
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    out.push({ label, isReal });
  };
  for (const t of article.tags || []) push(t, true);
  for (const h of hits) push(h.keyword, false);
  const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
  for (const s of SECTOR_TAXONOMY) {
    if (s.keywords.some((kw) => kw.trim().length >= 2 && keywordMatches(text, kw))) {
      push(s.name.replace('与软件', '').replace('与硬件', '').replace('与数码', '').replace('与平台', '').replace('与电力', '').replace('与贸易', '').replace('与金融', ''), false);
    }
  }
  return out.slice(0, 3);
}

function compactText(value: string | undefined | null): string {
  const text = (value || '').trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function summarizeTrendText(value: unknown): string {
  if (typeof value === 'string') return compactText(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const source = value as Record<string, unknown>;
  const parts = [
    source.shortTerm,
    source.midTerm,
    source.keyVariables,
    source.invalidation,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  return compactText(parts.join('；'));
}

function summarizeBullBear(article: NewsArticle): string {
  const debate = article.bullBearDebate;
  if (!debate) return '暂无明显争议；更多信息有助于判断是否需要继续追踪。';
  const bull = debate.bull?.[0]?.point ? `支持方：${debate.bull[0].point}` : '';
  const bear = debate.bear?.[0]?.point ? `反对方：${debate.bear[0].point}` : '';
  const core = debate.coreDispute ? `分歧焦点：${debate.coreDispute}` : '';
  const read = debate.read ? `当前判断：${debate.read}` : '';
  return compactText([bull, bear, core, read].filter(Boolean).join('；'));
}

function pickImpactSummary(article: NewsArticle): string {
  if (article.stakeholderImpact && article.stakeholderImpact.length > 0) {
    return article.stakeholderImpact
      .slice(0, 2)
      .map((item) => `${item.name}：${item.direction === 'benefit' ? '受益' : item.direction === 'pressure' ? '承压' : '中性'}`)
      .join('；');
  }
  return article.impactScope ? `影响范围：${article.impactScope}` : '影响范围：待补充';
}

function pickBackgroundSummary(article: NewsArticle): string {
  if (article.backstoryTimeline && article.backstoryTimeline.length > 0) {
    const first = article.backstoryTimeline[0];
    return `背景：${first.event}`;
  }
  if (article.relatedNews && article.relatedNews.length > 0) {
    return `背景：${article.relatedNews[0].title}`;
  }
  if (article.coreLogic?.essence) {
    return `背景：${article.coreLogic.essence}`;
  }
  return '背景：该事件本身尚未展开形成长线脉络，值得继续观察。';
}

function buildQuickRead(article: NewsArticle): {
  headline: string;
  why: string;
  impact: string;
  debate: string;
  outlook: string;
  label: string;
} {
  const headline = compactText(article.oneSentenceVerdict || article.summary || article.title);
  const why = compactText(article.coreLogic?.essence || article.summary || article.title);
  const impact = pickImpactSummary(article);
  const debate = summarizeBullBear(article);
  const outlook = compactText(
    summarizeTrendText(article.trendForecastText) ||
      (article.personaForecasts && article.personaForecasts.length > 0
        ? article.personaForecasts[0].keyMonitor || article.personaForecasts[0].bull.scenario
        : '') ||
      '短期内仍需观察关键变量变化，判断不宜过早定型。'
  );
  const label = article.oneSentenceVerdict ? '值得看' : '观察中';

  return {
    headline,
    why,
    impact,
    debate,
    outlook,
    label,
  };
}

interface StandardModeFeedProps {
  articles: NewsArticle[];
  importanceById?: Map<string, RankedArticleMeta>;
  relevanceById?: Map<string, RelevanceMeta>;
  authorityById?: Map<string, AuthorityMeta>;
  rankingMode?: 'global' | 'relevant' | 'authority';
  bookmarkedIds: string[];
  followedTags: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onToggleBookmark: (articleId: string) => void;
  onToggleFollowTag: (tag: string) => void;
  /** 用户监控词：用于在卡片上标注“命中我的监控” */
  radarKeywords?: RadarKeyword[];
  /** 点击监控徽标 = 移除该监控词（快捷管理） */
  onRemoveRadar?: (id: string) => void;
  /** AI 技能调用（卡片“一句话解读”盒子内整合） */
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 关联背景源 */
  contextArticles?: NewsArticle[];
  /** 打开精美分享小卡模态框 */
  onOpenShareCard?: (article: NewsArticle) => void;
  /** 简洁模式 vs 专业模式：控制首页卡片展示密度 */
  analysisMode?: 'simple' | 'professional';
}

export const StandardModeFeed = React.memo(function StandardModeFeed({
  articles,
  importanceById,
  relevanceById,
  authorityById,
  rankingMode = 'global',
  bookmarkedIds,
  followedTags,
  onSelectArticle,
  onToggleBookmark,
  onToggleFollowTag,
  radarKeywords = [],
  onRemoveRadar,
  onRunSkill,
  contextArticles,
  onOpenShareCard,
  analysisMode = 'simple',
}: StandardModeFeedProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = React.useCallback((e: React.MouseEvent, article: NewsArticle) => {
    e.stopPropagation();
    const url = article.sourceUrl || window.location.href;
    const textToCopy = `【见微情报】${article.title}\n${article.oneSentenceVerdict || article.summary || ''}\n${url}`;
    navigator.clipboard?.writeText(textToCopy).then(() => {
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(() => {});
  }, []);

  if (articles.length === 0) {
    return (
      <div className="bg-white border border-stone-300 rounded-xl p-12 text-center text-stone-500 font-sans">
        当前筛选维度下暂无情报：请尝试其他分类或清除雷达关键词；也可以点击顶部「AI 提交分析」投递一篇新情报。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans">
      {articles.map((article, index) => {
        const isBookmarked = bookmarkedIds.includes(article.id);
        const meta = importanceById?.get(article.id);
        const rel = relevanceById?.get(article.id);
        const authority = authorityById?.get(article.id);
        const hits = monitorHits(article, radarKeywords);
        const tagList = cardTags(article, hits);
        const quickRead = buildQuickRead(article);

        return (
          <article
            key={article.id}
            className="bg-white border border-stone-300 rounded-xl p-4 sm:p-5 shadow-none hover:border-stone-900 hover:shadow-sm transition-all group flex flex-col"
          >
            {/* 头部信息：来源 · 时间 · 多源 · 深度解读状态 */}
            <div className="mb-2.5 text-[11px] text-stone-500 border-b border-stone-200 pb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {/* 来源媒体：权威档位徽标（人工媒体档案）+ 媒体名 + 真实来源家数 */}
              {(() => {
                const prof = mediaProfile(article.sourceName, article.sourceUrl);
                const badge = prof ? tierBadge(prof.tier) : null;
                const primary = primarySourceKind(article.sourceName, article.sourceUrl);
                const display = prof?.displayName
                  || article.sourceName?.replace(/^www\./, '').replace(/\.(com|cn|net|org|gov)($|\.)/, '')
                  || '外部信源';
                const hostTitle = prof
                  ? `${prof.displayName}｜${prof.type}｜权威 ${prof.tier} 级\n${prof.profile}`
                  : `来源 ${article.sourceName || ''}（未收录媒体档案，未做权威评价）`;
                return (
                  <span className="inline-flex items-center gap-1" title={hostTitle}>
                    {badge ? (
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded border text-[10px] ${badge.cls}`}>{badge.label}</span>
                    ) : (
                      <span className="font-mono text-stone-400 text-[10px] border border-dashed border-stone-300 rounded px-1 py-0.5">来源未收录</span>
                    )}
                    <span className="font-serif font-bold text-stone-900">{display}</span>
                    {primary && (
                      <span
                        className="font-mono text-[10px] text-amber-800 bg-amber-50 border border-amber-300 rounded px-1 py-0.5"
                        title="官方/一手来源（主体自述、官方公告或监管文件），仍需与其他来源交叉印证"
                      >
                        {primarySourceLabel(primary)}
                      </span>
                    )}
                    {article.sourceCategory && (
                      <span
                        className="font-mono text-[10px] text-stone-500 border border-stone-200 rounded px-1 py-0.5 bg-stone-50"
                        title={`信源分类：${sourceCategoryLabel(article.sourceCategory)}`}
                      >
                        {sourceCategoryLabel(article.sourceCategory)}
                      </span>
                    )}
                  </span>
                );
              })()}
              <EvidenceBadge article={article} corpus={contextArticles} compact />
              <span className="text-stone-300">·</span>
              {/* 时间：相对 + 悬停完整日期 */}
              <span className="font-mono text-stone-600" title={article.publishedAt || article.sourceDate || article.date || ''}>
                {formatArticleTime(article)}
              </span>
              <span className="text-stone-300">·</span>
              {/* 深度解读状态 */}
              {article.isExternal && article.spectrumLayers && article.spectrumLayers.length > 0 && (
                <span className="font-mono font-bold text-[#0284C7] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200" title="已完成 AI 深度解读">
                  ✓ 已深读
                </span>
              )}
              {isStaleArticle(article, 30) && (
                <span className="font-mono font-bold text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200" title="发布日期距今超过 30 天，历史条目">历史旧闻</span>
              )}
              {/* 命中监控词 */}
              {hits.length > 0 && (
                <span className="inline-flex items-center gap-1 font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-300" title="命中您的监控词；点 ✕ 移除该监控">
                  <Radio className="w-3 h-3" />
                  {hits.slice(0, 2).map((h) => (
                    <span key={h.id}>
                      {h.keyword.length > 8 ? h.keyword.slice(0, 7) + '…' : h.keyword}
                      {onRemoveRadar && (
                        <button onClick={(e) => { e.stopPropagation(); onRemoveRadar(h.id); }} className="ml-0.5 hover:text-stone-900 font-bold" title={`移除监控词「${h.keyword}」`}>✕</button>
                      )}
                    </span>
                  ))}
                  {hits.length > 2 && <span>+{hits.length - 2}</span>}
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 font-mono text-stone-400" title="情绪为对标题+摘要的财经情感词典命中判定，非 AI 判断">
                {articleSentiment(article)}
              </span>
            </div>

            {/* 重要度 / 权威度 / 可信度 / 相关度：按当前排序视角分离展示 */}
            {meta ? (
              <div
                className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]"
                title={[
                  ...(rankingMode === 'authority' && authority ? authority.reasons : meta.reasons),
                  `可信度依据：${meta.credibilityReasons.join('、')}`,
                  ...(rel?.reasons?.length ? [`相关依据：${rel.reasons.join('、')}`] : []),
                ].join(' · ')}
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-900 font-serif text-xs font-black text-white">
                  {index + 1}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono font-bold ${
                  (authority?.score ?? 0) >= 70
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : (authority?.score ?? 0) >= 45
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-stone-200 bg-stone-100 text-stone-600'
                }`}>
                  {(authority?.score ?? 0) >= 70 ? '高可信' : (authority?.score ?? 0) >= 45 ? '中可信' : '待核验'}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono font-bold ${
                  article.evidenceChain && article.evidenceChain.length > 0
                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                    : 'border-stone-200 bg-stone-100 text-stone-600'
                }`}>
                  {article.evidenceChain && article.evidenceChain.length > 0 ? '事实+证据' : '观察中'}
                </span>
                <span className="font-serif font-bold text-stone-800">
                  {rankingMode === 'relevant'
                    ? `相关度 ${rel?.score ?? 0}`
                    : rankingMode === 'authority'
                      ? `权威度 ${authority?.score ?? 0}`
                      : `全球重要度 ${meta.score}`}
                </span>
                <span className="text-stone-300">·</span>
                <span className="font-serif font-bold text-stone-600" title={meta.credibilityReasons.join('、')}>
                  可信度 {meta.credibility}
                </span>
                {rankingMode === 'relevant' && rel && rel.score > 0 && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="text-emerald-700 font-serif font-bold">对我相关 {rel.score}</span>
                  </>
                )}
                <span className="text-stone-300">·</span>
                <span className="min-w-0 truncate text-stone-500">
                  {rankingMode === 'authority' && authority?.reasons?.length
                    ? authority.reasons.slice(0, 3).join(' · ')
                    : rankingMode === 'relevant' && rel?.reasons?.length
                    ? rel.reasons.slice(0, 3).join(' · ')
                    : meta.reasons.slice(0, 3).join(' · ')}
                </span>
              </div>
            ) : null}

            {/* Title & Subtitle */}
            <div className="cursor-pointer" onClick={() => onSelectArticle(article)}>
              <h2 className="text-base sm:text-lg font-serif font-black text-stone-950 group-hover:text-[#E3120B] transition-colors leading-snug mb-1.5 line-clamp-2">
                {article.title}
              </h2>
              {article.subtitle ? (
                <p className="text-xs sm:text-sm font-serif text-stone-600 leading-relaxed mb-3 line-clamp-2">
                  <KeyTermHighlight text={article.subtitle} entities={(article.entityMentions || []).map((e) => e.name)} />
                </p>
              ) : null}
            </div>

            {/* 内容概述：先看懂新闻本身，再进入 AI 解读 */}
            {(() => {
              const content =
                article.summary && article.summary !== article.title
                  ? article.summary
                  : '';
              return content ? (
                <p className="mb-3 text-xs sm:text-sm leading-relaxed text-stone-700 line-clamp-3">
                  <KeyTermHighlight
                    text={content}
                    entities={(article.entityMentions || []).map((e) => e.name)}
                  />
                </p>
              ) : (
                <p className="mb-3 text-xs text-stone-400">
                  原文未提供内容摘要，可打开下方原文查看详情。
                </p>
              );
            })()}

            {/* 速读卡：简洁版，重点保留结论、关键原因和前景 */}
            {(() => {
              const evidenceState = article.evidenceChain && article.evidenceChain.length > 0 ? '较强' : '待核验';
              const analysisState = article.bullBearDebate ? '有争议' : '偏单一';
              const forecastState = article.trendForecastText || (article.personaForecasts && article.personaForecasts.length > 0) ? '有前瞻' : '无明确前瞻';

              return (
                <div className="mb-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-stone-50 to-white p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-amber-800 uppercase">
                      速读
                    </div>
                    <div className="text-[10px] font-bold text-stone-500">
                      {quickRead.label} · {meta?.credibility ? `可信度 ${meta.credibility}` : '观察中'}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">事实：{evidenceState}</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">分析：{analysisState}</span>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">预测：{forecastState}</span>
                  </div>

                  <p className="mt-2 text-sm sm:text-base font-serif font-black leading-snug text-stone-900">
                    {quickRead.headline}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] leading-relaxed text-stone-700">
                    <span className="rounded-full border border-stone-200 bg-white px-2 py-1">
                      <span className="font-bold text-stone-900">关键原因：</span> {compactText(quickRead.why)}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-white px-2 py-1">
                      <span className="font-bold text-stone-900">前景：</span> {compactText(quickRead.outlook)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 7W 事件模型 + 趋势/风险/关联背景整合盒 */}
            {onRunSkill ? (
              <CardInsightBox article={article} contextArticles={contextArticles} onRunSkill={onRunSkill} onOpenArticle={onSelectArticle} />
            ) : (
              <div className="bg-[#FAF8F5] border-l-4 border-[#E3120B] p-4 rounded-r-lg mb-2">
                <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1">
                  见微 · 一句话解读
                </div>
                <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-snug">
                  “{article.oneSentenceVerdict || article.summary || article.title}”
                </p>
              </div>
            )}

            {/* 标签 + 重要信号行 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[10px] font-serif font-bold text-stone-400 mr-0.5">关键词：</span>
              {tagList.length === 0 && <span className="text-[11px] text-stone-400">—</span>}
              {tagList.map((t) =>
                t.isReal ? (
                  <button
                    key={t.label}
                    onClick={() => onToggleFollowTag(t.label)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      followedTags.includes(t.label)
                        ? 'bg-red-50 border-red-300 text-[#E3120B] font-bold'
                        : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
                    }`}
                    title={followedTags.includes(t.label) ? '已关注此标签' : '关注此标签'}
                  >
                    #{t.label}
                  </button>
                ) : (
                  <span key={t.label} className="text-[11px] px-2 py-0.5 rounded-full border border-stone-200 bg-white text-stone-500" title="自动派生标签（赛道/监控词命中）">
                    #{t.label}
                  </span>
                )
              )}
            </div>

            {/* 操作 */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100 mt-auto">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleBookmark(article.id)}
                  className={`p-2 rounded-lg border transition-colors ${
                    isBookmarked
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                  }`}
                  title={isBookmarked ? '取消收藏' : '收藏到我的情报库'}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenShareCard) {
                      onOpenShareCard(article);
                    } else {
                      handleCopyLink(e, article);
                    }
                  }}
                  className={`p-2 rounded-lg border transition-colors ${
                    copiedId === article.id
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-950'
                  }`}
                  title="生成见微情报分享长图 / 复制摘要"
                >
                  {copiedId === article.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>

                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-950 transition-colors inline-flex items-center"
                    title="新窗口打开原始信源出处"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <button
                onClick={() => onSelectArticle(article)}
                className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>打开详情</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
});

StandardModeFeed.displayName = 'StandardModeFeed';
