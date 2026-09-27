import React from 'react';
import { NewsArticle } from '../../types';
import {
  Flame, TrendingUp, TrendingDown, Minus, ShieldCheck,
  Database, AlertTriangle, Activity, Hash,
} from 'lucide-react';
import { todayShort } from '../../utils/dateUtils';
import { BreakingHit, HotWord } from '../../utils/todayBrief';
import { MethodBadge } from '../common/MethodBadge';

export interface SectorHeatItem {
  id: string;
  name: string;
  count: number;
  /** 该赛道下今日命中的高频词（≤3） */
  topWords: string[];
}

interface HeroStats {
  /** 语料库总条数（含历史） */
  total: number;
  /** 今日（本地日期当天发布）外部条目数 */
  todayCount: number;
  /** 窗口内实际参与词典扫描的样本数 */
  scanned: number;
  /** 窗口内命中正面词条数 */
  positive: number;
  /** 窗口内命中负面词条数 */
  negative: number;
  /** 窗口内未命中正负词的条数 */
  neutral: number;
  /** 同篇正负词均命中的条数 */
  mixed: number;
  /** 净情绪 [-100,100]；null = 样本内无任何正负词命中 */
  net: number | null;
  /** 正向占比 %；null = 无正负命中 */
  ratio: number | null;
  /** 是否存在真实运行时语料（RSS 或用户提交，不代表必须来自外部抓取） */
  hasLive: boolean;
  /** 本次情绪统计实际采用的口径：today=今日条目优先；30d=今日样本不足回退近30天 */
  scope: 'today' | '30d';
}

interface HomeHeroStatusProps {
  stats: HeroStats;
  /** 今日重大突发（重大才有；空数组时不显示该行） */
  breaking: BreakingHit[];
  /** 当前窗口热词（真实命中计数 Top N，独立于赛道筛选） */
  hotWords: HotWord[];
  onOpenBreaking: (article: NewsArticle) => void;
  onSelectHotWord?: (word: string) => void;
}

/** 把净情绪分翻译成一句人话 */
function verdictOf(net: number | null, scanned: number): {
  word: string; sub: string; cls: string; Icon: typeof TrendingUp;
} {
  if (net === null) {
    return {
      word: scanned === 0 ? '暂无样本' : '无明显倾向',
      sub: scanned === 0
        ? '今日没有可扫描的条目，暂无情绪结论'
        : '今日样本未命中正/负面关键词，消息面偏中性',
      cls: 'text-stone-600 bg-stone-100 border-stone-300',
      Icon: Minus,
    };
  }
  if (net >= 40) {
    return {
      word: '明显偏乐观', sub: '好消息显著多于坏消息', cls: 'text-emerald-800 bg-emerald-50 border-emerald-300', Icon: TrendingUp,
    };
  }
  if (net >= 15) {
    return {
      word: '温和乐观', sub: '好消息略占上风，但不算一边倒', cls: 'text-emerald-700 bg-emerald-50 border-emerald-300', Icon: TrendingUp,
    };
  }
  if (net > -15) {
    return {
      word: '多空胶着', sub: '好消息与坏消息大致均衡', cls: 'text-stone-700 bg-stone-100 border-stone-300', Icon: Minus,
    };
  }
  if (net > -40) {
    return {
      word: '温和谨慎', sub: '坏消息略多，宜留一份风险意识', cls: 'text-amber-700 bg-amber-50 border-amber-300', Icon: TrendingDown,
    };
  }
  return {
    word: '明显偏谨慎', sub: '坏消息显著多于好消息', cls: 'text-red-700 bg-red-50 border-red-300', Icon: TrendingDown,
  };
}

export const HomeHeroStatus: React.FC<HomeHeroStatusProps> = ({
  stats,
  breaking,
  hotWords,
  onOpenBreaking,
  onSelectHotWord,
}) => {
  const { todayCount, scanned, positive, negative, neutral, mixed, net, hasLive, scope } = stats;
  const verdict = verdictOf(net, scanned);
  const { Icon } = verdict;
  const meterLeft = net === null ? 50 : Math.max(0, Math.min(100, ((net + 100) / 200) * 100));
  const isTodayScope = scope === 'today';
  const gaugeTip =
    '情绪值：词典统计 (正面-负面)/(正面+负面)×100，仅对“今日发布”条目（今日样本不足20条时自动放宽近30天）；热词/突发同为可复核的关键词计数，非 AI 判断。词表见 utils/corpusMetrics.ts 与 utils/sectorTaxonomy.ts。';

  return (
    <div className="mb-4 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-mono font-bold uppercase tracking-[0.08em] text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
          {todayShort()} · 速览
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-stone-700">
          <Database className="w-3 h-3" />
          {hasLive ? '实时' : '无数据'}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${verdict.cls}`}>
          <Icon className="w-3 h-3" />
          {verdict.word}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700 font-serif font-bold">
          <TrendingUp className="w-3 h-3" /> {positive}
        </span>
        <span className="inline-flex items-center gap-1 text-red-600 font-serif font-bold">
          <TrendingDown className="w-3 h-3" /> {negative}
        </span>
        <span className="inline-flex items-center gap-1 text-stone-500 font-medium">
          <Minus className="w-3 h-3" /> {neutral}
        </span>
        {mixed > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
            <Activity className="w-3 h-3" /> {mixed}
          </span>
        )}
      </div>

      {hotWords.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {hotWords.slice(0, 4).map((item) => (
            <button
              key={item.word}
              type="button"
              onClick={() => onSelectHotWord?.(item.word)}
              className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-100"
            >
              #{item.word}
            </button>
          ))}
        </div>
      )}

      {breaking.length > 0 && (
        <div className="mt-2 border-t border-stone-200 pt-2 text-[11px] text-red-700">
          <span className="inline-flex items-center gap-1 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" /> 重点事件
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {breaking.slice(0, 2).map((b) => (
              <button
                key={b.word + (b.article.id || b.article.title)}
                onClick={() => {
                  const art = {
                    id: b.article.id || `breaking-${Date.now()}`,
                    title: b.article.title,
                    sourceName: b.article.sourceName,
                    sourceUrl: b.article.sourceUrl,
                    category: '重大突发',
                    isExternal: true,
                  } as NewsArticle;
                  onOpenBreaking(art);
                }}
                className="text-left underline decoration-red-300 underline-offset-2 hover:text-red-600"
              >
                {b.word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** 极小的口径说明图标（hover 看说明；不占正文空间） */
function HelpTipIcon({ tip }: { tip: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 ml-0.5 rounded-full text-[9px] leading-none bg-stone-200 text-stone-500 cursor-help font-bold"
      title={tip}
    >
      ?
    </span>
  );
}
