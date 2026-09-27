import React from 'react';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CheckCircle2,
  Clock3,
  Crosshair,
  Radio,
  Sparkles,
  Target,
} from 'lucide-react';
import type { MorningBriefing, UserPersona } from '../../types';

interface MorningBriefingHeroProps {
  briefing: MorningBriefing;
  persona: UserPersona;
  onOpenArticle: (articleId: string) => void;
  onDismiss: () => void;
  onOpenAudio: () => void;
  onOpenSettings: () => void;
}

function BriefingList({
  title,
  icon,
  items,
  onOpenArticle,
}: {
  title: string;
  icon: React.ReactNode;
  items: MorningBriefing['keyChanges'];
  onOpenArticle: (articleId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-stone-600">
        {icon}
        {title}
      </div>
      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {items.map((item) => (
          <button
            key={`${title}-${item.articleId}`}
            type="button"
            onClick={() => onOpenArticle(item.articleId)}
            className="w-full text-left py-2.5 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#E3120B] shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-serif font-bold text-stone-900 leading-snug">
                  {item.title}
                </span>
                <span className="mt-1 block text-[10px] text-stone-500">
                  {item.sourceName} · {item.reason}
                </span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const MorningBriefingHero: React.FC<MorningBriefingHeroProps> = ({
  briefing,
  persona,
  onOpenArticle,
  onDismiss,
  onOpenAudio,
  onOpenSettings,
}) => {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border-2 border-stone-900 bg-stone-950 text-stone-100 shadow-xl">
      <div className="border-b border-stone-800 px-5 sm:px-7 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 font-bold text-stone-950">
              <BellRing className="w-3 h-3" />
              下次晨报
            </span>
            <span className="text-stone-400">{briefing.date}</span>
            <span className="text-stone-600">·</span>
            <span className="text-stone-300">{persona.name}视角</span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[10px] font-serif font-bold text-stone-400 hover:text-white underline underline-offset-2"
          >
            管理晨报设置
          </button>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-serif font-black leading-tight text-white">
          {briefing.title}
        </h1>
        <p className="mt-2 max-w-4xl text-xs sm:text-sm leading-relaxed text-stone-300">
          {briefing.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-0">
        <div className="p-5 sm:p-7 space-y-6 lg:border-r border-stone-800">
          <BriefingList
            title="值得关注的变化"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            items={briefing.keyChanges}
            onOpenArticle={onOpenArticle}
          />
          {briefing.keyChanges.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-700 px-4 py-8 text-center text-xs text-stone-400">
              当前语料暂无可形成晨报的新变化。
            </div>
          )}
          <BriefingList
            title="与你最相关"
            icon={<Target className="w-3.5 h-3.5 text-sky-400" />}
            items={briefing.relevantToYou}
            onOpenArticle={onOpenArticle}
          />
        </div>

        <div className="p-5 sm:p-7 space-y-5 bg-stone-900/70">
          <BriefingList
            title="监控词命中"
            icon={<Radio className="w-3.5 h-3.5 text-amber-400" />}
            items={briefing.radarHits}
            onOpenArticle={onOpenArticle}
          />

          {briefing.predictionsDue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-stone-400">
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                到期待复核
              </div>
              <div className="space-y-2">
                {briefing.predictionsDue.map((prediction) => (
                  <div
                    key={prediction.contractId}
                    className="rounded-lg border border-red-900/70 bg-red-950/30 px-3 py-2"
                  >
                    <div className="text-xs font-serif font-bold text-red-100 line-clamp-2">
                      {prediction.question}
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-red-300">{prediction.dueLabel}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {briefing.watchNext.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-serif font-bold text-stone-400">
                <Clock3 className="w-3.5 h-3.5 text-emerald-400" />
                今日继续观察
              </div>
              <div className="flex flex-wrap gap-1.5">
                {briefing.watchNext.map((sector) => (
                  <span
                    key={sector}
                    className="rounded-full border border-stone-700 bg-stone-800 px-2.5 py-1 text-[10px] text-stone-200"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-stone-800 px-3 py-2">
              <div className="text-[9px] font-mono text-stone-500">语料</div>
              <div className="text-lg font-mono font-black text-white">{briefing.articleCount}</div>
            </div>
            <div className="rounded-lg border border-stone-800 px-3 py-2">
              <div className="text-[9px] font-mono text-stone-500">来源</div>
              <div className="text-lg font-mono font-black text-white">{briefing.sourceCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-800 px-5 sm:px-7 py-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenAudio}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-serif font-bold text-stone-200 hover:border-stone-500"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          朗读晨报
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-serif font-bold text-stone-950 hover:bg-amber-300"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          开始浏览今日情报
        </button>
      </div>
    </section>
  );
};
