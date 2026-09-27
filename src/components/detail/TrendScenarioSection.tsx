import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Crosshair,
  CheckCircle2,
  Calendar,
  Clock,
  RefreshCw,
  BookmarkCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import type { NewsArticle, NewsSkill, PredictionContract, UserPersona } from '../../types';

interface TrendScenarioSectionProps {
  article: NewsArticle;
  activePersona: UserPersona;
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  onSaveContract?: (contract: PredictionContract) => Promise<boolean>;
}

export const TrendScenarioSection: React.FC<TrendScenarioSectionProps> = ({
  article,
  activePersona,
  onRunSkill,
  onSaveContract,
}) => {
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [contractSaved, setContractSaved] = useState(false);

  // 解析 trendForecastText（可能是对象，也可能是字符串）
  const trendData = (() => {
    const raw = article.trendForecastText;
    if (!raw) return null;
    if (typeof raw === 'object' && 'shortTerm' in raw) {
      return raw as { shortTerm: string; midTerm: string; keyVariables: string; invalidation: string };
    }
    if (typeof raw === 'string' && raw.trim()) {
      return {
        shortTerm: raw,
        midTerm: '参见下方深入情景推演',
        keyVariables: '相关行业政策与市场供需变化',
        invalidation: '核心假设或关键宏观变量发生逆转',
      };
    }
    return null;
  })();

  const handleGenerateTrend = async () => {
    if (!onRunSkill || loadingTrend) return;
    setLoadingTrend(true);
    try {
      await onRunSkill('trend', article);
    } finally {
      setLoadingTrend(false);
    }
  };

  const handleSaveToLedger = async () => {
    if (!onSaveContract || savingContract || contractSaved) return;
    setSavingContract(true);
    try {
      const now = new Date();
      // 默认 90 天后为到期结算观测期
      const dueDate = new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      const contract: PredictionContract = {
        id: `contract-${article.id}-${Date.now().toString(36)}`,
        articleId: article.id,
        articleTitle: article.title,
        articleCategory: article.category,
        question: `【趋势研判】${article.title}：未来 3~6 个月是否会兑现关键演化？`,
        createdAt: now.toISOString(),
        targetVerificationDate: dueDate,
        userPred: {
          direction: 'positive',
          directionText: '正向演化',
          confidence: 70,
          premises: [trendData?.shortTerm || article.oneSentenceVerdict || article.title],
          falsifiableIndicator: trendData?.invalidation || '核心变量出现反向突破或官方政策重大转向',
        },
        aiPred: {
          modelName: 'gemini-2.5-flash',
          direction: 'positive',
          directionText: '基准路径',
          confidence: 68,
          verdict: trendData?.midTerm || '基于行业演化规律与多源事实推断',
        },
        gapSummary: '人机对该趋势演进方向高度共识，均关注短期验证节点',
        status: 'pending',
      };

      const success = await onSaveContract(contract);
      if (success) {
        setContractSaved(true);
      }
    } finally {
      setSavingContract(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-stone-900 bg-white p-5 sm:p-7 shadow-md space-y-5 font-sans">
      {/* 标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-red-600" />
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 tracking-tight">
              未来趋势推演 · 条件情景树与证伪线
            </h2>
            <p className="text-xs text-stone-500 font-serif">
              拒绝算命废话：提供分阶段里程碑、关键触发器、明确的「证伪失效线」，并可一键追踪
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!trendData && onRunSkill && (
            <button
              type="button"
              disabled={loadingTrend}
              onClick={handleGenerateTrend}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-serif font-bold transition-colors disabled:opacity-50"
            >
              {loadingTrend ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{loadingTrend ? '正在推演情景…' : '推演未来情景树'}</span>
            </button>
          )}

          {trendData && onSaveContract && (
            <button
              type="button"
              disabled={savingContract || contractSaved}
              onClick={handleSaveToLedger}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-bold border transition-all ${
                contractSaved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-stone-900 hover:bg-stone-800 text-white border-stone-900'
              }`}
            >
              {contractSaved ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : savingContract ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{contractSaved ? '已加入预测账本追踪' : '存入预测账本 · 到期自动回测'}</span>
            </button>
          )}
        </div>
      </div>

      {trendData ? (
        <div className="space-y-4">
          {/* 两阶段演化路径：短期验证节点 vs 中期分水岭 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 短期（1-3个月）验证节点 */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-sky-900 font-serif font-bold text-xs">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>短期窗口（1~3 个月）：首个验证节点</span>
              </div>
              <p className="text-sm font-serif text-stone-900 leading-relaxed font-bold">
                {trendData.shortTerm}
              </p>
              <div className="text-[11px] text-sky-800 font-mono pt-1">
                观察重点：等待第一个量化财报或官方政策落地。
              </div>
            </div>

            {/* 中期（3-12个月）关键演化 */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-purple-900 font-serif font-bold text-xs">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>中期分水岭（3~12 个月）：格局重构</span>
              </div>
              <p className="text-sm font-serif text-stone-900 leading-relaxed font-bold">
                {trendData.midTerm}
              </p>
              <div className="text-[11px] text-purple-800 font-mono pt-1">
                观察重点：行业渗透率分化与新秩序建立。
              </div>
            </div>
          </div>

          {/* 关键变量与失效证伪线（科学决策的核心：定条件，不定死结论） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* 关键变量 */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-stone-700 font-serif font-bold text-xs uppercase tracking-wider">
                <Crosshair className="w-4 h-4 text-amber-600" />
                <span>需要持续盯盘的核心变量（Key Variables）</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-800 font-serif leading-relaxed">
                {trendData.keyVariables}
              </p>
            </div>

            {/* 证伪失效红线 */}
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-red-900 font-serif font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>证伪线（出现什么信号代表上述判断失效）</span>
              </div>
              <p className="text-xs sm:text-sm text-red-950 font-serif font-bold leading-relaxed">
                {trendData.invalidation}
              </p>
            </div>
          </div>

          {/* 身份透镜建议联动提示 */}
          <div className="rounded-lg bg-stone-100 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-stone-700 font-serif">
              当前正以 <b className="text-stone-900">【{activePersona.name}】</b> 视角审视未来走势。
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              预测存入账本后，系统将在到期时自动由真实语料核验
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center space-y-2">
          <p className="text-sm font-serif font-bold text-stone-700">
            本条目尚未生成四行趋势模型
          </p>
          <p className="text-xs text-stone-500">
            点击上方“推演未来情景树”，AI 将基于客观事实与行业机制推导短期节点、中期分水岭与证伪失效线。
          </p>
        </div>
      )}
    </section>
  );
};
