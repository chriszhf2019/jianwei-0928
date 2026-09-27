import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  Users,
  Compass,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { NewsArticle, NewsSkill } from '../../types';

interface DialecticalMatrixSectionProps {
  article: NewsArticle;
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
}

export const DialecticalMatrixSection: React.FC<DialecticalMatrixSectionProps> = ({
  article,
  onRunSkill,
}) => {
  const [loadingSkill, setLoadingSkill] = useState<string | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [stakeholderExpanded, setStakeholderExpanded] = useState(true);

  const debate = article.bullBearDebate;
  const timeline = article.backstoryTimeline;
  const stakeholders = article.stakeholderImpact;
  const coreLogic = article.coreLogic;

  // 触发生成某个具体技能
  const handleTriggerSkill = async (skill: NewsSkill) => {
    if (!onRunSkill || loadingSkill) return;
    setLoadingSkill(skill);
    try {
      await onRunSkill(skill, article);
    } finally {
      setLoadingSkill(null);
    }
  };

  const hasDebate = debate && ((debate.bull && debate.bull.length > 0) || (debate.bear && debate.bear.length > 0));
  const hasTimeline = timeline && timeline.length > 0;
  const hasStakeholders = stakeholders && stakeholders.length > 0;

  return (
    <div className="space-y-6 font-sans">
      {/* 模块主标题 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#E3120B]" />
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 tracking-tight">
              深度探索 · 内幕溯源与红蓝对抗
            </h2>
            <p className="text-xs text-stone-500 font-serif">
              穿透表面通稿：探究“为什么现在爆发”、理清“谁得利谁受损”、并列“反方批判视角”
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>对抗式审视 · 拒绝单向信息茧房</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. 红蓝对抗思辨矩阵（Consensus vs Contrarian） */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-stone-900 bg-white p-5 sm:p-6 shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950">
              红蓝博弈天平 · 主流观点 vs 相反/批判质疑
            </h3>
          </div>

          {!hasDebate && onRunSkill && (
            <button
              type="button"
              disabled={loadingSkill === 'debate'}
              onClick={() => handleTriggerSkill('debate')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold transition-colors disabled:opacity-50"
            >
              {loadingSkill === 'debate' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{loadingSkill === 'debate' ? '正在推演对抗论点…' : '生成红蓝对抗分析'}</span>
            </button>
          )}
        </div>

        {/* 核心争议命门中轴（Pivot of Dispute） */}
        {debate?.coreDispute ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-amber-900 uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4 text-amber-700" />
              <span>争议核心焦点（双方真正争吵的本质）</span>
            </div>
            <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
              “{debate.coreDispute}”
            </p>
            {debate.read && (
              <p className="mt-1.5 text-xs text-amber-800/90 font-mono">
                力量天平研判：{debate.read}
              </p>
            )}
          </div>
        ) : (
          !hasDebate && (
            <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500">
              当前尚未生成正反方对抗博弈分析。点击右上角按钮即可由 AI 红队生成。
            </div>
          )
        )}

        {/* 双栏对撞展示：正方/主流叙事 vs 反方/批判视角 */}
        {hasDebate && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左栏：主流/支持叙事 */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-1.5 text-emerald-900 font-serif font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>主流 / 看好叙事（Consensus / Bull）</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                  支持方论据
                </span>
              </div>

              <div className="space-y-2.5">
                {(debate?.bull || []).map((item, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="flex items-start gap-1.5 font-serif font-bold text-stone-900">
                      <span className="text-emerald-600 font-mono">0{idx + 1}.</span>
                      <span className="leading-snug">{item.point}</span>
                    </div>
                    {item.basis && (
                      <div className="pl-4 text-[11px] text-stone-600 font-sans leading-relaxed">
                        <span className="text-stone-400">依据：</span>
                        {item.basis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 右栏：反方/批判/审慎视角 */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4.5 space-y-3">
              <div className="flex items-center justify-between border-b border-red-200 pb-2">
                <div className="flex items-center gap-1.5 text-red-900 font-serif font-bold text-sm">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span>相反 / 批判质疑（Contrarian / Bear）</span>
                </div>
                <span className="text-[10px] font-mono text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">
                  反方做空/挑刺
                </span>
              </div>

              <div className="space-y-2.5">
                {(debate?.bear || []).map((item, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="flex items-start gap-1.5 font-serif font-bold text-stone-900">
                      <span className="text-red-600 font-mono">0{idx + 1}.</span>
                      <span className="leading-snug">{item.point}</span>
                    </div>
                    {item.basis && (
                      <div className="pl-4 text-[11px] text-stone-600 font-sans leading-relaxed">
                        <span className="text-stone-400">质疑点：</span>
                        {item.basis}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-100 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-stone-400 shrink-0" />
          <span>
            口径说明：红蓝对抗旨在帮助用户从批判性视角独立审视，反方论点代表市场质疑或学术保留态度，非事实结论裁决。
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. 事件前因全景溯源（为什么现在爆发？历史时间线） */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0284C7]" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950">
              事件前因溯源 · 为什么现在爆出？
            </h3>
            {timeline && (
              <span className="text-xs font-mono text-stone-500">
                ({timeline.length} 个前情节点)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!hasTimeline && onRunSkill && (
              <button
                type="button"
                disabled={loadingSkill === 'timeline'}
                onClick={() => handleTriggerSkill('timeline')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-serif font-bold transition-colors disabled:opacity-50"
              >
                {loadingSkill === 'timeline' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{loadingSkill === 'timeline' ? '正在梳理前史…' : '梳理前情时间轴'}</span>
              </button>
            )}

            {hasTimeline && (
              <button
                type="button"
                onClick={() => setTimelineExpanded(!timelineExpanded)}
                className="text-stone-500 hover:text-stone-900 p-1"
              >
                {timelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {hasTimeline ? (
          timelineExpanded && (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {timeline.map((node, index) => (
                <div key={index} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-stone-400 border-2 border-white group-hover:bg-[#0284C7] transition-colors" />
                  <div className="rounded-lg bg-stone-50 border border-stone-200/80 p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {node.date}
                      </span>
                      <span className="text-[11px] font-serif text-[#0284C7] font-bold">
                        {node.relevance}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-serif text-stone-800 leading-relaxed">
                      {node.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-4 rounded-lg bg-stone-50 border border-dashed border-stone-300 text-center text-xs text-stone-500">
            暂未提取本事件的历史诱因与铺垫时间线。点击右上角按钮即可调取全景编年史。
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. 幕后利益网络（谁直接受益？谁直接受损？） */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950">
              利益相关方透视 · 谁收益？谁承压？
            </h3>
            {stakeholders && (
              <span className="text-xs font-mono text-stone-500">
                ({stakeholders.length} 个关键主体)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!hasStakeholders && onRunSkill && (
              <button
                type="button"
                disabled={loadingSkill === 'stakeholders'}
                onClick={() => handleTriggerSkill('stakeholders')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-serif font-bold transition-colors disabled:opacity-50"
              >
                {loadingSkill === 'stakeholders' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                )}
                <span>{loadingSkill === 'stakeholders' ? '正在分析利益方…' : '提取利益相关方'}</span>
              </button>
            )}

            {hasStakeholders && (
              <button
                type="button"
                onClick={() => setStakeholderExpanded(!stakeholderExpanded)}
                className="text-stone-500 hover:text-stone-900 p-1"
              >
                {stakeholderExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {hasStakeholders ? (
          stakeholderExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stakeholders.map((s, idx) => {
                const isBenefit = s.direction === 'benefit';
                const isPressure = s.direction === 'pressure';
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 space-y-2 ${
                      isBenefit
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : isPressure
                          ? 'border-red-200 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-stone-950">
                        {s.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isBenefit
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPressure
                              ? 'bg-red-100 text-red-800'
                              : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {isBenefit ? '直接受益' : isPressure ? '直接承压' : '中性博弈'} (★{s.strength})
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 font-sans leading-relaxed">
                      {s.why}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="p-4 rounded-lg bg-stone-50 border border-dashed border-stone-300 text-center text-xs text-stone-500">
            暂未提取本事件的利益博弈方。点击右上角按钮即可由 AI 全面扫描上下游影响。
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. 底层第一性机制（一句话本质 + 反直觉盲点） */}
      {/* ────────────────────────────────────────────────────────── */}
      {coreLogic && (
        <div className="rounded-xl border border-stone-300 bg-stone-100/60 p-4 sm:p-5 space-y-2.5">
          <div className="text-xs font-serif font-bold text-stone-500 uppercase tracking-wider">
            第一性原理 · 底层机制
          </div>
          <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-snug">
            “{coreLogic.essence}”
          </p>
          {coreLogic.points && coreLogic.points.length > 0 && (
            <ul className="list-disc list-inside text-xs text-stone-700 space-y-1 pt-1 font-sans">
              {coreLogic.points.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          )}
          {coreLogic.counterIntuitive && (
            <div className="mt-2 text-xs text-amber-900 bg-amber-100/70 border border-amber-200 rounded p-2 font-serif">
              <b>最易反直觉误读之处：</b>{coreLogic.counterIntuitive}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
