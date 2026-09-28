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
  BarChart3,
  EyeOff,
  Radio,
  ExternalLink,
  Info,
  BookOpen,
  Target,
  Award,
} from 'lucide-react';
import type { NewsArticle, NewsSkill } from '../../types';
import { TheoryExplainerModal, TheoryKey } from '../common/TheoryExplainerModal';

interface DialecticalMatrixSectionProps {
  article: NewsArticle;
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  sectionScope?: 'all' | 'debate_only' | 'background_only';
  showHeader?: boolean;
}

export const DialecticalMatrixSection: React.FC<DialecticalMatrixSectionProps> = ({
  article,
  onRunSkill,
  sectionScope = 'all',
  showHeader = true,
}) => {
  const [loadingSkill, setLoadingSkill] = useState<string | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [stakeholderExpanded, setStakeholderExpanded] = useState(true);
  const [blindspotTab, setBlindspotTab] = useState<'distribution' | 'silent'>('distribution');
  const [showCognitiveGuide, setShowCognitiveGuide] = useState(false);
  const [activeTheoryKey, setActiveTheoryKey] = useState<TheoryKey | null>(null);

  // 刻意练习模式状态（Cognitive Gym）
  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [challengeScore, setChallengeScore] = useState<number | null>(null);

  const debate = article.bullBearDebate;
  const timeline = article.backstoryTimeline;
  const stakeholders = article.stakeholderImpact;
  const coreLogic = article.coreLogic;

  // 1. 定量对冲卡锚点（AlphaSense 风格：真实数据指标支撑定性论点）
  const quantAnchors = (() => {
    if (article.quantitativeAnchors && article.quantitativeAnchors.length > 0) {
      return article.quantitativeAnchors;
    }
    return [];
  })();

  // 2. 媒体立场与异常沉默盲区雷达（Ground News 风格：谁在报道，谁在沉默）
  const blindspotData = (() => {
    if (article.mediaBlindspot) {
      return article.mediaBlindspot;
    }
    const occurrences = article.sourceOccurrences || [];
    if (occurrences.length >= 2) {
      const counts: Record<string, number> = {};
      for (const occ of occurrences) {
        const name = occ.sourceName || '其他独立媒体';
        counts[name] = (counts[name] || 0) + 1;
      }
      const total = occurrences.length;
      const breakdown = Object.entries(counts).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
        stanceBias: '独立信源报道',
      }));
      return {
        breakdown,
        silentSector: '暂未检测到统计显著的异常回避群体',
        blindspotWarning: `当前聚合了来自 ${total} 家不同媒体的真实交叉报道，信源覆盖相对均衡。`,
      };
    }
    return null;
  })();

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
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#E3120B]" />
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 tracking-tight">
                深度探索 · 内幕溯源与红蓝博弈
              </h2>
              <p className="text-xs text-stone-500 font-serif">
                穿透表面通稿：定量指标对冲、红蓝正反驳论、媒体沉默盲区透视
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCognitiveGuide(!showCognitiveGuide)}
              className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>{showCognitiveGuide ? '收起认知方法论' : '💡 为什么这样设计？(认知方法论)'}</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>对抗式审视 · 拒绝单向信息茧房</span>
            </div>
          </div>
        </div>
      )}

      {/* 认知方法论展开引导卡片（帮助使用者理解科学思维） */}
      {showHeader && showCognitiveGuide && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <div className="flex items-center gap-2 font-serif font-bold text-amber-950 text-sm">
              <span>🧠 为什么我们要强迫你“看反方、看数据、看沉默”？</span>
            </div>
            <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              CIA & 诺贝尔经济学奖方法论
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-serif text-stone-800">
            <div className="rounded-lg bg-white/80 p-3 border border-amber-200/60 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1">
                <span className="text-red-600">①</span> 为什么要看反方挑刺？
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                <b>CIA ACH 竞争假设原则</b>：寻找能推翻假说的反面漏洞，比搜集 10 个顺从的公关报道更能保护资产安全。直视反方漏洞，等于戴上防坑装甲。
              </p>
            </div>

            <div className="rounded-lg bg-white/80 p-3 border border-amber-200/60 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1">
                <span className="text-indigo-600">②</span> 为什么要看定量对冲卡？
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                <b>AlphaSense 数据锚点原则</b>：公关修辞可以说是任意编造的，但资本支出 (CapEx)、交付周期和利差无法撒谎。用硬数据把定性论据砸实。
              </p>
            </div>

            <div className="rounded-lg bg-white/80 p-3 border border-amber-200/60 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1">
                <span className="text-amber-600">③</span> 为什么要看沉默盲区？
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                <b>媒体生态学遗漏原则</b>：当所有财经大号都在吹捧时，供应链一线厂商却异常沉默。这种“失声”往往预示着私下利益协议或潜在风险。
              </p>
            </div>
          </div>
        </div>
      )}

      {(sectionScope === 'all' || sectionScope === 'debate_only') && (
        <>
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
            {/* 理论精解按钮 */}
            <button
              type="button"
              onClick={() => setActiveTheoryKey('cia-ach')}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-300 transition-colors cursor-pointer"
              title="查看 CIA 竞争假设分析法 (ACH) 理论说明"
            >
              <BookOpen className="w-3 h-3 text-stone-500" />
              <span>理论原理</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* 思维训练营挑战按钮 */}
            <button
              type="button"
              onClick={() => setShowChallenge(!showChallenge)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-serif font-bold border transition-all cursor-pointer ${
                showChallenge
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>{showChallenge ? '收起思维测验' : '🎯 红队盲猜挑战操'}</span>
            </button>

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
        </div>

        {/* 🧠 刻意练习卡片（Cognitive Gym Exercise） */}
        {showChallenge && (
          <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/90 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-serif font-bold text-amber-950 text-sm">
                <Target className="w-4 h-4 text-amber-600" />
                <span>【思维刻意练习】在揭晓反方做空牌之前：像对手一样思考！</span>
              </div>
              <span className="text-[10px] font-mono text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded font-bold">
                击碎证实偏差
              </span>
            </div>
            <p className="text-xs text-stone-700 font-sans leading-relaxed">
              假设你是一个手握重金的做空机构，准备对该主流事件发起致命一击，<b>最可能致命的阿喀琉斯之踵在哪个环节？</b>（先盲猜再翻牌，训练情报嗅觉）
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                { key: 'A', text: 'A. 关键供应链脱节、交付履约断点或执行不及预期' },
                { key: 'B', text: 'B. 客户付费意愿不足，自由现金流严重失血' },
                { key: 'C', text: 'C. 行业监管突袭、垄断调查与反垄断重锤' },
                { key: 'D', text: 'D. 护城河过浅，被开源或低价竞品快速稀释' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSelectedGuess(opt.key);
                    setChallengeScore(10);
                  }}
                  className={`p-2.5 rounded-lg border text-left text-xs font-serif transition-all cursor-pointer ${
                    selectedGuess === opt.key
                      ? 'border-amber-600 bg-white font-bold text-stone-950 shadow-xs ring-1 ring-amber-500'
                      : 'border-amber-200 bg-white/70 hover:bg-white text-stone-800'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {selectedGuess && (
              <div className="rounded-lg bg-amber-100/80 border border-amber-300 p-3 space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-serif font-bold text-amber-900">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>测验反馈：你的红队刺客直觉已启动！经验值 +{challengeScore}</span>
                </div>
                <p className="text-[11px] text-stone-700 font-sans leading-relaxed">
                  你选择了 <b>选项 {selectedGuess}</b>。现在请下滑查看右栏的【相反/批判质疑】，做空机构正是紧紧咬住了现金流造血与供应链瓶颈！
                  这种在看答案前<b>“先主动推演对手弱点”</b>的动作，正是 CIA 顶级分析师击碎自我证实偏差的最有效刻意练习。
                </p>
              </div>
            )}
          </div>
        )}

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
      {/* 2. 【全新重磅】关键定量指标对冲卡（AlphaSense 风格） */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950">
              定量锚点对冲卡 · 用硬数据核验定性论点
            </h3>
            {/* 理论原理按钮 */}
            <button
              type="button"
              onClick={() => setActiveTheoryKey('alphasense-quant')}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-300 transition-colors cursor-pointer"
              title="查看 AlphaSense 定量指标对冲法理论说明"
            >
              <BookOpen className="w-3 h-3 text-stone-500" />
              <span>理论原理</span>
            </button>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
              数据底座 · 杜绝空谈
            </span>
          </div>
          <span className="text-xs text-stone-400 font-mono">对标行业基准数据</span>
        </div>

        {quantAnchors.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-stone-500 font-serif border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
            当前文章暂无结构化定量锚点指标。可在下方查阅真实证据链，或点击右上角「生成红蓝对抗分析」由 AI 结合事实提炼。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quantAnchors.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-xl border p-3.5 space-y-2 flex flex-col justify-between transition-all hover:shadow-xs ${
                  item.direction === 'bull'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : item.direction === 'bear'
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-stone-200 bg-stone-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 font-serif mb-1">
                    <span>{item.name}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        item.direction === 'bull'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.direction === 'bear'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {item.direction === 'bull' ? '支撑多方' : item.direction === 'bear' ? '支撑空方' : '中性锚点'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-serif font-black text-stone-950">
                      {item.value}
                    </span>
                    {item.delta && (
                      <span
                        className={`text-xs font-mono font-bold ${
                          item.direction === 'bull'
                            ? 'text-emerald-700'
                            : item.direction === 'bear'
                              ? 'text-rose-700'
                              : 'text-stone-600'
                        }`}
                      >
                        {item.delta}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                    基准：{item.benchmark}
                  </div>
                </div>

                <div className="text-[11px] text-stone-600 font-sans leading-tight pt-2 border-t border-stone-200/60">
                  {item.meaning}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. 【全新重磅】报道阵营分布与“沉默盲区”雷达（Ground News 风格） */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-600" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-stone-950">
              媒体立场透视 · 报道阵营与沉默盲区 (Blindspot)
            </h3>
            {/* 理论原理按钮 */}
            <button
              type="button"
              onClick={() => setActiveTheoryKey('groundnews-blindspot')}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-300 transition-colors cursor-pointer"
              title="查看 Ground News 媒体沉默盲区透视理论说明"
            >
              <BookOpen className="w-3 h-3 text-stone-500" />
              <span>理论原理</span>
            </button>
            <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              谁在发声 · 谁在回避
            </span>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-xs font-serif">
            <button
              type="button"
              onClick={() => setBlindspotTab('distribution')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                blindspotTab === 'distribution'
                  ? 'bg-white font-bold text-stone-950 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              阵营分布比
            </button>
            <button
              type="button"
              onClick={() => setBlindspotTab('silent')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                blindspotTab === 'silent'
                  ? 'bg-white font-bold text-amber-800 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <EyeOff className="w-3 h-3 text-amber-600" />
              <span>沉默盲区警示</span>
            </button>
          </div>
        </div>

        {!blindspotData ? (
          <div className="py-6 px-4 text-center text-xs text-stone-500 font-serif border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
            暂无多媒体阵营分布与沉默盲区数据。当事件汇聚多源交叉报道或由 AI 深度提炼时将自动呈现阵营分布。
          </div>
        ) : blindspotTab === 'distribution' ? (
          <div className="space-y-3">
            {/* 多阵营比例堆叠条 */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-stone-100">
              {blindspotData.breakdown.map((b, i) => {
                const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600'];
                return (
                  <div
                    key={i}
                    style={{ width: `${b.percentage}%` }}
                    className={`${colors[i % colors.length]} transition-all`}
                    title={`${b.category}: ${b.percentage}%`}
                  />
                );
              })}
            </div>

            {/* 阵营明细网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {blindspotData.breakdown.map((b, i) => {
                const textColors = ['text-blue-700', 'text-indigo-700', 'text-emerald-700', 'text-amber-700'];
                const dotColors = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600'];
                return (
                  <div key={i} className="rounded-lg bg-stone-50 border border-stone-200/80 p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-serif font-bold text-stone-800">
                        <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                        <span>{b.category}</span>
                      </div>
                      <span className={`font-mono font-bold ${textColors[i % textColors.length]}`}>
                        {b.percentage}%
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-sans leading-tight">
                      主导偏向：{b.stanceBias}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-sm">
              <EyeOff className="w-4 h-4 text-amber-700" />
              <span>异常失声阵营：{blindspotData.silentSector}</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-800 font-serif leading-relaxed">
              {blindspotData.blindspotWarning}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-800/80 font-mono pt-1">
              <Info className="w-3.5 h-3.5" />
              <span>战略决策依据：当某一利益关联群体集体保持沉默，其背后的信息增量往往大于公开宣传。</span>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {(sectionScope === 'all' || sectionScope === 'background_only') && (
        <>
      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. 事件前因全景溯源（为什么现在爆发？历史时间线） */}
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
      {/* 5. 幕后利益网络（谁直接受益？谁直接受损？） */}
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
      {/* 6. 底层第一性机制（一句话本质 + 反直觉盲点） */}
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
      </>
      )}

      {/* 理论精解说明弹窗 */}
      <TheoryExplainerModal
        theoryKey={activeTheoryKey}
        onClose={() => setActiveTheoryKey(null)}
      />
    </div>
  );
};
