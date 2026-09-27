import React from 'react';
import { History, ArrowRight, Clock3, Radio, Layers } from 'lucide-react';
import type { NewsArticle } from '../../types';
import { buildOngoingEvents } from '../../utils/ongoingEvents';
import { sevenElementsPlain } from '../../utils/plainSummary';

interface EventTrackingPanelProps {
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
}

function leadText(article: NewsArticle): string {
  return (article.summary || article.subtitle || '').trim() || sevenElementsPlain(article);
}

export function EventTrackingPanel({
  articles,
  onSelectArticle,
}: EventTrackingPanelProps) {
  const events = React.useMemo(
    () => buildOngoingEvents(articles, { recentDays: 7, limit: 5, requireUpdates: 2 }),
    [articles]
  );

  if (events.length === 0) {
    return (
      <section className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-serif font-black text-stone-900">事件追踪</h2>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          最近 7 天还没有出现需要持续跟进的事件。当同一事件连续多天有新报道时，会自动出现在这里。
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#0284C7]" />
          <h2 className="text-sm font-serif font-black text-stone-900">事件追踪 · 仍在发展</h2>
        </div>
        <span className="text-[10px] text-stone-400">按事件聚类，非单篇热度</span>
      </div>
      <p className="text-[11px] text-stone-500 mb-3">
        同一事件在最近 7 天有连续报道时进入这里。今天有新进展的事件优先展示。
      </p>

      <div className="space-y-2.5">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectArticle(event.latest)}
            className="w-full text-left rounded-lg border border-stone-200 hover:border-stone-500 bg-white p-3 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {event.hasTodayUpdate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-serif font-bold text-red-700">
                      <Radio className="w-3 h-3" /> 今日更新
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-serif font-bold text-amber-700">
                      <Clock3 className="w-3 h-3" /> {event.daySpanLabel}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                    <Layers className="w-3 h-3" /> {event.sourceCount} 源 · {event.memberCount} 篇
                  </span>
                </div>

                <div className="text-sm font-serif font-bold text-stone-900 leading-snug group-hover:text-[#E3120B] transition-colors line-clamp-2">
                  {event.latest.title}
                </div>
                {leadText(event.latest) && (
                  <div className="mt-1 text-[11px] text-stone-500 leading-snug line-clamp-2">
                    {leadText(event.latest)}
                  </div>
                )}

                <div className="mt-2 space-y-1 text-[10px] text-stone-400">
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-stone-300 shrink-0" />
                    <span className="line-clamp-1">首报：{event.first.title}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-[#E3120B] shrink-0" />
                    <span className="line-clamp-1">最新：{event.latest.title}</span>
                  </div>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#E3120B] shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
