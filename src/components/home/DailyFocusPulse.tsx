import React, { useMemo } from 'react';
import {
  Flame,
  ArrowRight,
  Headphones,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Radio,
  Clock,
  ExternalLink,
  ShieldCheck,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import type { NewsArticle, MorningBriefing, UserPersona } from '../../types';
import { formatArticleTime } from '../../utils/articleTime';
import { buildEventClusters } from '../../utils/eventClusters';
import { type BreakingHit, type HotWord } from '../../utils/todayBrief';
import { importanceMeta } from '../../utils/importanceRank';

interface DailyFocusPulseProps {
  articles: NewsArticle[];
  todayArticles: NewsArticle[];
  briefing?: MorningBriefing | null;
  persona: UserPersona;
  breaking: BreakingHit[];
  hotWords: HotWord[];
  onSelectArticle: (article: NewsArticle) => void;
  onOpenAudio: () => void;
  onSelectHotWord?: (word: string) => void;
}

export const DailyFocusPulse: React.FC<DailyFocusPulseProps> = ({
  articles,
  todayArticles,
  briefing,
  persona,
  breaking,
  hotWords,
  onSelectArticle,
  onOpenAudio,
  onSelectHotWord,
}) => {
  // 综合计算今日 Top 3~5 重磅大事：
  // 1) 优先取今日发布且重要度评分前列的文章或聚类 lead
  // 2) 若今日条目不足，回退近期最重要的聚类
  const topFocusItems = useMemo(() => {
    const pool = todayArticles.length >= 3 ? todayArticles : articles;
    if (pool.length === 0) return [];

    const clusters = buildEventClusters(pool);
    const leads = clusters.map((c) => c.lead);

    // 按重要度评分排序
    const sorted = [...leads].sort((a, b) => {
      const scoreA = (importanceMeta(a)?.score ?? 0) + (a.sourceCount || 1) * 2;
      const scoreB = (importanceMeta(b)?.score ?? 0) + (b.sourceCount || 1) * 2;
      return scoreB - scoreA;
    });

    return sorted.slice(0, 5).map((article, index) => {
      // 动态识别事件演进状态：突发转折 / 关键推进 / 持续观察
      const isBreaking = breaking.some((b) => b.article.title === article.title || article.title.includes(b.word));
      const hasContrarian = (article.bullBearDebate?.bear?.length ?? 0) > 0 || !!article.riskReviewText;
      const hasMilestone = (article.backstoryTimeline?.length ?? 0) > 0 || (article.sourceCount || 1) >= 3;

      let statusType: 'breaking' | 'pivot' | 'ongoing' = 'ongoing';
      let statusLabel = '持续发酵';

      if (isBreaking) {
        statusType = 'breaking';
        statusLabel = '突发拐点';
      } else if (hasMilestone || hasContrarian) {
        statusType = 'pivot';
        statusLabel = '关键推进';
      }

      // 提取核心看点
      const watchPoint =
        article.oneSentenceVerdict ||
        article.subtitle ||
        article.summary ||
        article.title;

      // 为什么打破常规/核心背景
      const whyImportant =
        article.coreLogic?.essence ||
        (article.bullBearDebate?.coreDispute
          ? `争议焦点：${article.bullBearDebate.coreDispute}`
          : article.tags?.slice(0, 3).join(' · ') || article.category);

      return {
        article,
        statusType,
        statusLabel,
        watchPoint,
        whyImportant,
      };
    });
  }, [articles, todayArticles, breaking]);

  // 今日核心宏观定调（Executive Theme）
  const macroTheme = useMemo(() => {
    if (briefing?.title) return briefing.title;
    if (topFocusItems.length > 0) {
      const lead = topFocusItems[0].article;
      return lead.oneSentenceVerdict || `今日聚焦：${lead.title}`;
    }
    return '今日全球与国内宏观要闻动态跟踪';
  }, [briefing, topFocusItems]);

  const dateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  }, []);

  return (
    <section className="mb-6 rounded-2xl border-2 border-stone-900 bg-white shadow-xl overflow-hidden font-sans">
      {/* 顶部：头版横幅与快捷功能入口 */}
      <div className="bg-stone-950 text-stone-100 px-5 sm:px-7 py-4.5 border-b border-stone-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3120B] px-3 py-1 font-serif font-black text-white text-[11px] tracking-wide">
              <Compass className="w-3.5 h-3.5" />
              今日大事脉搏
            </span>
            <span className="font-mono text-stone-400">{dateStr}</span>
            <span className="text-stone-600 hidden sm:inline">|</span>
            <span className="text-stone-300 font-serif hidden sm:inline">{persona.name}透镜</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAudio}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white px-3 py-1.5 text-xs font-serif font-bold transition-colors border border-stone-700"
              title="一键收听今日 2 分钟浓缩早报"
            >
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span>2分钟音频速览</span>
            </button>
          </div>
        </div>

        {/* 宏观主线定调 */}
        <div className="mt-3.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-amber-400 font-bold mb-1">
            EXECUTIVE MACRO PULSE · 宏观主线定调
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-black text-white leading-snug">
            {macroTheme}
          </h1>
          {briefing?.summary && (
            <p className="mt-2 text-xs sm:text-sm text-stone-300 font-serif leading-relaxed line-clamp-2 max-w-4xl">
              {briefing.summary}
            </p>
          )}
        </div>
      </div>

      {/* 中部：Top 3~5 重磅大事陈列（带演进状态、看点与一键深度探索） */}
      <div className="p-4 sm:p-6 bg-stone-50/50">
        <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#E3120B]" />
            <h2 className="text-sm font-serif font-black text-stone-900 tracking-tight">
              今日必读 · 核心大事清单
            </h2>
            <span className="text-[11px] font-mono text-stone-500">
              ({topFocusItems.length} 条经过跨源多维加权)
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-500 hidden sm:inline">
            点击任意事件进入「内幕溯源 · 红蓝辩论 · 趋势推演」
          </span>
        </div>

        {topFocusItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500">
            暂无已识别的重大焦点，可在下方浏览完整信息流。
          </div>
        ) : (
          <div className="space-y-3">
            {topFocusItems.map((item, idx) => {
              const { article, statusType, statusLabel, watchPoint, whyImportant } = item;
              return (
                <div
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="group relative cursor-pointer rounded-xl border border-stone-200 bg-white p-4 transition-all duration-150 hover:border-stone-900 hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* 标题栏与演进状态 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-stone-900 text-white font-mono text-[10px] font-black shrink-0">
                          {idx + 1}
                        </span>

                        {statusType === 'breaking' && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-1.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            {statusLabel}
                          </span>
                        )}
                        {statusType === 'pivot' && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5">
                            {statusLabel}
                          </span>
                        )}
                        {statusType === 'ongoing' && (
                          <span className="inline-flex items-center gap-1 rounded bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-medium px-1.5 py-0.5">
                            {statusLabel}
                          </span>
                        )}

                        <span className="text-[11px] font-serif font-bold text-stone-500">
                          {article.category}
                        </span>
                        <span className="text-stone-300">·</span>
                        <span className="text-[11px] font-mono text-stone-500">
                          {article.sourceName}
                        </span>
                        <span className="text-stone-300">·</span>
                        <span className="text-[11px] font-mono text-stone-400">
                          {formatArticleTime(article)}
                        </span>
                      </div>

                      {/* 大事件主标题 */}
                      <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950 group-hover:text-[#E3120B] transition-colors leading-snug">
                        {article.title}
                      </h3>

                      {/* 核心看点速览（发生了什么 / 为什么重要） */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-sans">
                        <div className="rounded bg-stone-50 px-2.5 py-1.5 border border-stone-200/80">
                          <span className="text-stone-500 font-bold">核心判断：</span>
                          <span className="text-stone-800 font-serif leading-relaxed">
                            {watchPoint}
                          </span>
                        </div>
                        <div className="rounded bg-stone-50 px-2.5 py-1.5 border border-stone-200/80">
                          <span className="text-stone-500 font-bold">纵深脉络：</span>
                          <span className="text-stone-800 font-serif leading-relaxed">
                            {whyImportant}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 右侧进入行动按钮 */}
                    <div className="sm:self-center shrink-0 flex items-center gap-1 text-xs font-serif font-bold text-stone-600 group-hover:text-[#E3120B] group-hover:translate-x-1 transition-all">
                      <span>深度探索</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 底部：突发警报与热词穿透 */}
        <div className="mt-4 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {breaking.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                突发预警
              </span>
              {breaking.slice(0, 3).map((b, i) => (
                <button
                  key={`${b.word}-${i}`}
                  type="button"
                  onClick={() => {
                    const found = articles.find((a) => a.id === b.article.id || a.title === b.article.title);
                    if (found) onSelectArticle(found);
                  }}
                  className="text-xs text-stone-700 hover:text-red-700 underline underline-offset-2"
                >
                  【{b.word}】{b.article.title}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>今日语料暂无不可控恶性突发信号，大盘平稳发酵。</span>
            </div>
          )}

          {/* 今日高频热词 */}
          {hotWords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-stone-400 font-mono">热词焦点:</span>
              {hotWords.slice(0, 5).map((hw) => (
                <button
                  key={hw.word}
                  type="button"
                  onClick={() => onSelectHotWord?.(hw.word)}
                  className="rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-mono px-2 py-0.5 transition-colors"
                >
                  #{hw.word} ({hw.count})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
