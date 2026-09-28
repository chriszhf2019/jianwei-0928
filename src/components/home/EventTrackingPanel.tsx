import React, { useState, useEffect } from 'react';
import { 
  History, 
  ArrowRight, 
  Clock3, 
  Radio, 
  Layers, 
  Bookmark, 
  Sparkles, 
  Activity, 
  ChevronRight, 
  Check, 
  Bell, 
  Compass, 
  ShieldAlert,
  Flame
} from 'lucide-react';
import type { NewsArticle } from '../../types';
import { buildOngoingEvents, OngoingEvent } from '../../utils/ongoingEvents';
import { sevenElementsPlain } from '../../utils/plainSummary';

interface EventTrackingPanelProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
  compact?: boolean;
}

// 判定事件当前所处生命周期阶段
function deriveEventStage(event: OngoingEvent): {
  stage: 'breaking' | 'debating' | 'verifying' | 'landing';
  label: string;
  badgeCls: string;
  dotColor: string;
} {
  const count = event.memberCount;
  const days = event.distinctDays;
  const hasControversy = !!event.latest.bullBearDebate?.coreDispute;

  if (days <= 1 && count <= 3) {
    return {
      stage: 'breaking',
      label: '⚡ 突发爆发期',
      badgeCls: 'bg-red-50 text-red-700 border-red-200',
      dotColor: 'bg-red-500',
    };
  }
  if (hasControversy || count >= 5) {
    return {
      stage: 'debating',
      label: '🔄 多方博弈发酵期',
      badgeCls: 'bg-amber-50 text-amber-800 border-amber-300',
      dotColor: 'bg-amber-500',
    };
  }
  if (days >= 4) {
    return {
      stage: 'verifying',
      label: '⚖️ 深度求证与扩散期',
      badgeCls: 'bg-blue-50 text-blue-800 border-blue-200',
      dotColor: 'bg-blue-500',
    };
  }
  return {
    stage: 'landing',
    label: '🎯 产业落地兑现期',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
  };
}

// 派生事件下一步的核心盯盘悬念
function deriveNextCatalyst(event: OngoingEvent): string {
  if (event.latest.trendForecastText && typeof event.latest.trendForecastText === 'object') {
    const raw = event.latest.trendForecastText as any;
    if (raw.keyVariables) return `盯盘核心：${raw.keyVariables}`;
    if (raw.shortTerm) return `近期验证点：${raw.shortTerm}`;
  }
  if (event.latest.bullBearDebate?.coreDispute) {
    return `争议破局点：${event.latest.bullBearDebate.coreDispute}`;
  }
  return '后续验证点：关注官方通告、上下游供应链交付反馈与财报数据';
}

export function EventTrackingPanel({
  articles,
  onSelectArticle,
  compact = false,
}: EventTrackingPanelProps) {
  const events = React.useMemo(
    () => buildOngoingEvents(articles, { recentDays: 7, limit: compact ? 3 : 4, requireUpdates: 2 }),
    [articles, compact]
  );

  const [trackedEventIds, setTrackedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jianwei_tracked_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleTrackEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrackedEventIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('jianwei_tracked_events', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <section className="bg-white border-2 border-stone-900 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-serif font-black text-stone-900">重大事件演变追踪雷达</h2>
        </div>
        <p className="mt-2 text-xs text-stone-500 font-serif">
          最近 7 天暂未出现持续发酵的多日演变事件。当同一事件在多天内出现连续进展时，将在此自动生成动态脉络雷达。
        </p>
      </section>
    );
  }

  return (
    <section className={`bg-white border-2 border-stone-900 rounded-2xl shadow-md space-y-4 font-sans ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      {/* 头部：标题与价值定位 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-serif font-black text-stone-950 tracking-tight">
                重大事件动态演进追踪雷达
              </h2>
              <span className="text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded">
                正在发展中 ({events.length})
              </span>
            </div>
            <p className="text-xs text-stone-500 font-serif">
              拒绝孤立碎片报道：自动追踪长线脉络、锁定生命周期阶段、标出今日新动向
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-600 animate-pulse" /> 实时脉络监测
          </span>
        </div>
      </div>

      {/* 动态事件演化网格 */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {events.map((event) => {
          const stageInfo = deriveEventStage(event);
          const nextCatalyst = deriveNextCatalyst(event);
          const isTracked = trackedEventIds.includes(event.id);
          const latestVerdict = event.latest.oneSentenceVerdict || event.latest.summary || event.latest.title;

          return (
            <div
              key={event.id}
              onClick={() => onSelectArticle(event.latest)}
              className="rounded-xl border-2 border-stone-200 hover:border-stone-900 bg-stone-50/50 hover:bg-white p-4 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between space-y-3 group"
            >
              {/* 卡片头部：生命周期阶段 + 更新频次 + 关注按钮 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-serif font-bold border ${stageInfo.badgeCls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stageInfo.dotColor}`} />
                    {stageInfo.label}
                  </span>

                  {event.hasTodayUpdate ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-2 py-0.5 text-[10px] font-serif font-bold animate-pulse">
                      今日有新进展
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                      <Clock3 className="w-3 h-3" /> {event.daySpanLabel}
                    </span>
                  )}

                  <span className="text-[10px] font-mono text-stone-400">
                    {event.sourceCount} 家独立信源 · {event.memberCount} 篇追踪
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleTrackEvent(event.id, e)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    isTracked
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white border-stone-200 text-stone-400 hover:text-stone-800'
                  }`}
                  title={isTracked ? '已设为重点追踪' : '关注该事件后续演变'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isTracked ? 'fill-amber-600 text-amber-600' : ''}`} />
                </button>
              </div>

              {/* 事件核心主题 */}
              <div>
                <h3 className="text-sm sm:text-base font-serif font-black text-stone-950 group-hover:text-[#E3120B] transition-colors leading-snug line-clamp-2">
                  {event.latest.title}
                </h3>
                <p className="mt-1.5 text-xs text-stone-600 font-serif leading-relaxed line-clamp-2">
                  <b>【今日增量定调】</b> {latestVerdict}
                </p>
              </div>

              {/* 演变微脉络时间轴 (Chronological Micro-Timeline) */}
              <div className="rounded-lg bg-white border border-stone-200/90 p-2.5 space-y-1.5 text-[11px] font-sans">
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 border-b border-stone-100 pb-1">
                  <span>事件演化里程碑</span>
                  <span>{event.distinctDays} 天演化窗口</span>
                </div>

                <div className="space-y-1 text-stone-700">
                  <div className="flex items-start gap-1.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />
                    <span className="text-stone-500 font-mono text-[10px] shrink-0">起因首报:</span>
                    <span className="line-clamp-1 text-stone-600">{event.first.title}</span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                    <span className="text-red-700 font-mono text-[10px] font-bold shrink-0">最新动向:</span>
                    <span className="line-clamp-1 font-bold text-stone-900">{event.latest.title}</span>
                  </div>
                </div>
              </div>

              {/* 底部：核心盯盘点与直达深度研判 */}
              <div className="pt-1 flex items-center justify-between gap-2 text-xs border-t border-stone-200">
                <div className="flex items-center gap-1 text-[11px] text-amber-800 font-serif line-clamp-1">
                  <Compass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{nextCatalyst}</span>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-stone-900 group-hover:text-[#E3120B] shrink-0">
                  <span>深度研判</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

