import React from 'react';
import { UserPersona, NewsArticle, SnapshotResponse } from '../../types';
import { GlobalPulseDashboard } from './GlobalPulseDashboard';
import { FrequentPatternPanel } from './FrequentPatternPanel';
import { DataSourceHealthPanel } from './DataSourceHealthPanel';
import { EntityCoveragePanel } from './EntityCoveragePanel';
import { SyndicationPanel } from './SyndicationPanel';
import { CrossEventNexusPanel } from './CrossEventNexusPanel';
import { SentimentHeatmap24h } from './SentimentHeatmap24h';
import { IntelligenceDensityCurve } from './IntelligenceDensityCurve';
import { MentionRegionAIPanel } from './MentionRegionAIPanel';
import { RegionDependenceWidget } from './RegionDependenceWidget';
import { RegionIntelligencePanel } from './RegionIntelligencePanel';
import { TodayBlindspotWidget } from './TodayBlindspotWidget';
import { TomorrowWatchlistWidget } from './TomorrowWatchlistWidget';
import { AIStrategicAdvisor } from './AIStrategicAdvisor';
import { Activity, Database, RefreshCw, ShieldCheck, ChevronDown } from 'lucide-react';
import { useAIProvider } from '../../hooks/useAIProvider';
import { articleSortTime } from '../../utils/articleTime';
import { FeatureSummary } from '../common/FeatureSummary';

type SnapshotStatus = 'loading' | 'ok' | 'error';

interface IntelligenceHubViewProps {
  selectedPersona: UserPersona;
  contextArticles: NewsArticle[];
  snapshot: SnapshotResponse | null;
  snapshotStatus: SnapshotStatus;
  onRefreshSnapshot: () => void;
  onOpenSettings?: () => void;
  onSelectArticleTitle?: (title: string) => void;
  onOpenArticleById?: (articleId: string) => void;
  onOpenTermExplain?: (term: string) => void;
  /** 跳转「地区情报」深潜工作台（主体×矩阵×三级下钻×组合） */
  onGoRegion?: () => void;
}

export const IntelligenceHubView: React.FC<IntelligenceHubViewProps> = ({
  selectedPersona,
  contextArticles,
  snapshot,
  snapshotStatus,
  onRefreshSnapshot,
  onOpenSettings,
  onSelectArticleTitle,
  onOpenArticleById,
  onOpenTermExplain,
  onGoRegion,
}) => {
  const { provider: aiProvider, loading: aiLoading } = useAIProvider();
  const traceableCount = contextArticles.filter(
    (article) => Boolean(article.sourceUrl) && articleSortTime(article) > 0
  ).length;

  const handleOpenArticle = (article: NewsArticle) => {
    onOpenArticleById?.(article.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      {/* Compact title banner */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-7 border-2 border-stone-950 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">全球脉搏</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              今天哪里热，什么在升温
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-2xl">
              从当前语料里直接回答：全球热点、行业热点、近一周和近一个月变化、事件背景与正在出现的新热词。
            </p>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-xl border border-stone-700 shrink-0 text-right space-y-2">
            <div className="flex items-center justify-end gap-2">
              <span
                className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                  snapshotStatus === 'ok'
                    ? snapshot?.meta.demo
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : snapshotStatus === 'error'
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-stone-100 text-stone-600 border-stone-300'
                }`}
              >
                {snapshotStatus === 'ok'
                  ? snapshot?.meta.demo
                    ? '演示语料'
                    : snapshot?.meta.corpus === 'live'
                      ? '实时语料'
                      : '运行时语料'
                  : snapshotStatus === 'error'
                    ? '接口不可达'
                    : '加载中…'}
              </span>
              <button
                onClick={onRefreshSnapshot}
                disabled={snapshotStatus === 'loading'}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${snapshotStatus === 'loading' ? 'animate-spin' : ''}`} />
                <span>刷新</span>
              </button>
            </div>
            <div className="text-[11px] text-stone-400 font-mono">
              语料 {snapshot?.meta.corpusSize ?? contextArticles.length} 篇 · 可追溯 {traceableCount} 篇
            </div>
            <div className="text-[11px] text-stone-400 font-mono">
              AI 通道：{aiLoading ? '…' : aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'deepseek' ? 'DeepSeek' : '未配置'}
            </div>
          </div>
        </div>
      </div>

      <FeatureSummary featureId="intelligence-overview" compact />

      {/* Main pulse dashboard */}
      <GlobalPulseDashboard
        articles={contextArticles}
        onSelectArticle={handleOpenArticle}
        onOpenTermExplain={onOpenTermExplain}
      />

      {/* Background attribution: why these sectors are hot */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#E3120B]" />
          <h2 className="text-sm font-serif font-black text-stone-900">为什么集中发生</h2>
        </div>
        <FrequentPatternPanel articles={contextArticles} />
      </section>

      {/* Collapsible advanced verification tools */}
      <details className="group bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-stone-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-serif font-bold text-stone-800">高级核验工具</span>
            <span className="text-[10px] text-stone-400">数据源、转载、跨事件、地区深潜与 AI 顾问</span>
          </div>
          <ChevronDown className="w-4 h-4 text-stone-400 group-open:rotate-180 transition-transform" />
        </summary>

        <div className="border-t border-stone-200 px-4 sm:px-5 py-5 space-y-6">
          <DataSourceHealthPanel articles={contextArticles} />
          <SyndicationPanel articles={contextArticles} onOpenArticleById={onOpenArticleById} />
          <EntityCoveragePanel articles={contextArticles} />

          <CrossEventNexusPanel
            articles={contextArticles}
            onSelectArticleTitle={onSelectArticleTitle}
            onOpenArticleById={onOpenArticleById}
          />
          <SentimentHeatmap24h articles={contextArticles} onSelectArticleTitle={onSelectArticleTitle} />
          <IntelligenceDensityCurve articles={contextArticles} onSelectArticleTitle={onSelectArticleTitle} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3">
            <div className="text-xs text-sky-950 leading-relaxed">
              <b className="font-serif text-[#0369A1]">地区深潜</b>
              <span className="text-sky-800/90"> · AI 涉事地区标注、依赖预警、覆盖与近 7 天趋势</span>
            </div>
            {onGoRegion && (
              <button
                type="button"
                onClick={onGoRegion}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-serif font-bold transition-colors"
              >
                去地区工作台 →
              </button>
            )}
          </div>
          <MentionRegionAIPanel articles={contextArticles} />
          <RegionDependenceWidget articles={contextArticles} onOpenArticleById={onOpenArticleById} />
          <RegionIntelligencePanel articles={contextArticles} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TodayBlindspotWidget articles={contextArticles} onOpenSettings={onOpenSettings} />
            <TomorrowWatchlistWidget articles={contextArticles} />
          </div>

          <AIStrategicAdvisor selectedPersona={selectedPersona} contextArticles={contextArticles} />
        </div>
      </details>
    </div>
  );
};
