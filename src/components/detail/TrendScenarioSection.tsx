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
  Sliders,
  SlidersHorizontal,
  BellRing,
  Activity,
  Check,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Target,
  Award,
} from 'lucide-react';
import type { NewsArticle, NewsSkill, PredictionContract, UserPersona, TrendVariableMonitor } from '../../types';
import { TheoryExplainerModal, TheoryKey } from '../common/TheoryExplainerModal';

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
  const [confidenceProb, setConfidenceProb] = useState<number>(68); // 默认 68% 超级预测基线
  const [wechatNotifyEnabled, setWechatNotifyEnabled] = useState(true);
  const [showPredictiveGuide, setShowPredictiveGuide] = useState(false);
  const [activeTheoryKey, setActiveTheoryKey] = useState<TheoryKey | null>(null);

  // 波普尔科学度思维测验状态（Cognitive Gym）
  const [showPopperGym, setShowPopperGym] = useState(false);
  const [selectedPopperOption, setSelectedPopperOption] = useState<string | null>(null);

  // 解析 trendForecastText（可能是对象，也可能是字符串）
  const trendData = (() => {
    const raw = article.trendForecastText;
    if (!raw) return null;
    if (typeof raw === 'object' && 'shortTerm' in raw) {
      return raw as {
        shortTerm: string;
        midTerm: string;
        keyVariables: string;
        invalidation: string;
        baseProbability?: number;
        variablesMonitor?: TrendVariableMonitor[];
      };
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

  // 派生动态盯盘变量列表（带有状态与阈值）
  const variableMonitors: TrendVariableMonitor[] = (() => {
    if (trendData?.variablesMonitor && trendData.variablesMonitor.length > 0) {
      return trendData.variablesMonitor;
    }
    const cat = article.category || '';
    if (cat.includes('科技') || article.title.includes('AI') || article.title.includes('算力')) {
      return [
        { name: '头部客户订单复购率', status: 'normal', currentValue: '76%', threshold: '跌破 65% 预警', implication: 'B端真实落地造血指标，高于阈值则正向演进成立' },
        { name: '主流芯片供货交期', status: 'warning', currentValue: '26 周', threshold: '> 30 周触发断供', implication: '供应链爬坡接近警戒线，若进一步恶化将推迟中期兑现' },
        { name: '监管合规准入清单', status: 'normal', currentValue: '征求意见稿阶段', threshold: '限制性法案落地', implication: '尚未形成实质合规准入壁垒，窗口期持续' },
      ];
    } else if (cat.includes('金融') || article.title.includes('银行') || article.title.includes('利率')) {
      return [
        { name: '高收益城投/产业债利差', status: 'normal', currentValue: '210 bps', threshold: '> 280 bps 触发恐慌', implication: '信用风险未扩散，宏观温和修复逻辑延续' },
        { name: '核心 CPI 环比读数', status: 'warning', currentValue: '+0.1%', threshold: '连续两月 < 0% 触发通缩', implication: '需求端企稳信号偏弱，需防范政策加码不及预期' },
        { name: '流动性投放净额', status: 'normal', currentValue: '周度净投放 3200 亿', threshold: '转为净回笼 > 2000 亿', implication: '资金面维持充裕，对冲估值下行风险' },
      ];
    }
    return [
      { name: '官方核心统计口径', status: 'normal', currentValue: '平稳区间', threshold: '重大规则逆转', implication: '政策基调保持连续性，按基准路径推演' },
      { name: '行业主要玩家资本开支', status: 'warning', currentValue: '增速放缓至 8%', threshold: '负增长 > -5%', implication: '存量博弈加剧，注意防范价格战反噬' },
      { name: '跨媒体异动舆情指数', status: 'normal', currentValue: '62 / 100', threshold: '> 85 触发声誉危机', implication: '无恶性黑天鹅发酵风险' },
    ];
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
          direction: confidenceProb >= 50 ? 'positive' : 'negative',
          directionText: confidenceProb >= 50 ? '正向演进路径' : '反向做空路径',
          confidence: confidenceProb,
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
        gapSummary: `用户设定置信度 ${confidenceProb}%，系统基准 68%（${wechatNotifyEnabled ? '已开启微信异动提醒' : '未开启微信提醒'}）`,
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
    <section className="rounded-2xl border-2 border-stone-900 bg-white p-5 sm:p-7 shadow-md space-y-6 font-sans">
      {/* 标题栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-red-600" />
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-950 tracking-tight">
              未来趋势推演 · 条件情景树与证伪线
            </h2>
            <p className="text-xs text-stone-500 font-serif">
              拒绝算命废话：分阶段情景验证、动态变量雷达、置信度调校与白纸黑字证伪红线
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPredictiveGuide(!showPredictiveGuide)}
            className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-700" />
            <span>{showPredictiveGuide ? '收起方法论' : '💡 为什么有证伪线？(超级预测学)'}</span>
          </button>

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
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold border transition-all ${
                contractSaved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-stone-900 hover:bg-stone-800 text-white border-stone-900 shadow-xs'
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

      {/* 认知引导展开卡片 */}
      {showPredictiveGuide && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
            <div className="flex items-center gap-2 font-serif font-bold text-sky-950 text-sm">
              <span>🔮 为什么预测必须有“证伪线”和“胜率滑块”？</span>
            </div>
            <span className="text-[10px] font-mono text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
              波普尔科学哲学 & Tetlock 超级预测学
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-serif text-stone-800">
            <div className="rounded-lg bg-white/80 p-3 border border-sky-200/60 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1">
                <span className="text-red-600">①</span> 为什么必须有证伪线？
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                <b>波普尔可证伪性原则 (Karl Popper)</b>：无法被反驳的预言是神棍巫术。如果一个分析师说不出“发生什么代表自己错了”，他的言论就是毫无约束的廉价噪音。
              </p>
            </div>

            <div className="rounded-lg bg-white/80 p-3 border border-sky-200/60 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1">
                <span className="text-indigo-600">②</span> 为什么调节概率胜率？
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                <b>Tetlock 狐狸型认知 (Superforecasting)</b>：真正的高手从不下非黑即白的死结论。给概率打分（如 65% vs 35%）能训练客观直觉，避免过度自信的陷阱。
              </p>
            </div>

            <div className="rounded-lg bg-white/80 p-3 border border-sky-200/60 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1">
                <span className="text-emerald-600">③</span> 为什么设盯盘阈值？
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                <b>预警指标体系 (I&W)</b>：不是坐等黑天鹅砸中自己，而是看先行指标是否穿过警戒红线。指标异动时系统主动推送到微信，提前防范。
              </p>
            </div>
          </div>
        </div>
      )}

      {trendData ? (
        <div className="space-y-5">
          {/* 两阶段演化路径：短期验证节点 vs 中期分水岭 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 短期（1-3个月）验证节点 */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4.5 space-y-2">
              <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                <div className="flex items-center gap-1.5 text-sky-900 font-serif font-bold text-xs">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>短期窗口（1~3 个月）：首个验证节点</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                  第一里程碑
                </span>
              </div>
              <p className="text-sm font-serif text-stone-900 leading-relaxed font-bold">
                {trendData.shortTerm}
              </p>
              <div className="text-[11px] text-sky-800 font-mono pt-1">
                观察重点：等待第一个量化财报或官方政策落地。
              </div>
            </div>

            {/* 中期（3-12个月）关键演化 */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4.5 space-y-2">
              <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                <div className="flex items-center gap-1.5 text-purple-900 font-serif font-bold text-xs">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span>中期分水岭（3~12 个月）：格局重构</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  分水岭拐点
                </span>
              </div>
              <p className="text-sm font-serif text-stone-900 leading-relaxed font-bold">
                {trendData.midTerm}
              </p>
              <div className="text-[11px] text-purple-800 font-mono pt-1">
                观察重点：行业渗透率分化与新秩序建立。
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* 【全新重磅】盯盘变量动态监测雷达 (Signal Monitor) */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-serif font-bold text-stone-900 uppercase tracking-wider">
                  盯盘变量实时异动监测雷达 (Key Variables Live Monitor)
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                实时对比阈值边界
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {variableMonitors.map((vm, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 space-y-1.5 bg-white ${
                    vm.status === 'alert'
                      ? 'border-red-300 ring-1 ring-red-200'
                      : vm.status === 'warning'
                        ? 'border-amber-300'
                        : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-stone-900">{vm.name}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                        vm.status === 'alert'
                          ? 'bg-red-100 text-red-800'
                          : vm.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          vm.status === 'alert'
                            ? 'bg-red-600 animate-pulse'
                            : vm.status === 'warning'
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                        }`}
                      />
                      {vm.status === 'alert' ? '触发反转' : vm.status === 'warning' ? '接近阈值' : '正常推进'}
                    </span>
                  </div>

                  <div className="text-xs text-stone-700 font-mono">
                    当前：<b className="text-stone-900">{vm.currentValue}</b>
                    <span className="text-stone-400 mx-1">|</span>
                    预警阈值：<span className="text-red-700">{vm.threshold}</span>
                  </div>

                  <div className="text-[11px] text-stone-500 font-sans leading-tight pt-1 border-t border-stone-100">
                    {vm.implication}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* 【全新重磅】波普尔证伪失效红线 (Invalidation Line) */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="rounded-xl border-2 border-red-200 bg-red-50/70 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 pb-2">
              <div className="flex items-center gap-2 text-red-950 font-serif font-black text-sm">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>白纸黑字证伪失效红线（波普尔科学标准）</span>
                {/* 理论原理按钮 */}
                <button
                  type="button"
                  onClick={() => setActiveTheoryKey('popper-falsification')}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-red-800 hover:text-red-950 bg-red-100 hover:bg-red-200 px-2 py-0.5 rounded border border-red-300 transition-colors cursor-pointer"
                  title="查看波普尔可证伪性原则说明"
                >
                  <BookOpen className="w-3 h-3 text-red-600" />
                  <span>理论原理</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* 证伪科学度思维训练按钮 */}
                <button
                  type="button"
                  onClick={() => setShowPopperGym(!showPopperGym)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-serif font-bold border transition-all cursor-pointer ${
                    showPopperGym
                      ? 'bg-red-200 text-red-950 border-red-400 shadow-xs'
                      : 'bg-white hover:bg-red-100 text-red-900 border-red-300'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 text-red-600" />
                  <span>{showPopperGym ? '收起测验' : '🎯 测验我的证伪能力'}</span>
                </button>
                <span className="text-[10px] font-mono font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                  出现即推翻
                </span>
              </div>
            </div>

            {/* 🧠 波普尔刻意练习挑战（Popper Cognitive Gym） */}
            {showPopperGym && (
              <div className="rounded-xl border-2 border-dashed border-red-300 bg-white p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-900 text-xs sm:text-sm">
                    <Target className="w-4 h-4 text-red-600" />
                    <span>【波普尔可证伪性实战测验】在商业研判中，哪一种表述符合科学决策标准？</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">点击选项即时打分</span>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    {
                      id: 'A',
                      text: 'A. “未来市场竞争日趋激烈，宏观大环境可能发生剧烈震荡，投资者需防范下行风险。”',
                      score: 20,
                      verdict: '❌ 评分 20分（算命式忽悠）：典型的伪科学表述。充斥“可能”、“或许”等模糊词，怎么说都立于不败之地，毫无可检验性。',
                    },
                    {
                      id: 'B',
                      text: 'B. “若该公司长期无法达成行业龙头地位、估值持续平庸，则本研判失败。”',
                      score: 45,
                      verdict: '⚠️ 评分 45分（半及格）：缺少明确的时间窗口（多长算长期？）与量化指标，容易在未来事后找借口。',
                    },
                    {
                      id: 'C',
                      text: 'C. “若未来 90 天内其关键产品月活环比净流失 > 15%，或主力芯片交期突破 30 周，本套看好研判立即推翻！”',
                      score: 98,
                      verdict: '✅ 评分 98分（波普尔最高科学度！）：包含具体时间窗口（90天）、定量触发指标（15%/30周）、承诺不模糊。这才是严肃的专业预测！',
                    },
                  ].map((opt) => (
                    <div key={opt.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPopperOption(opt.id)}
                        className={`w-full p-2.5 rounded-lg border text-left text-xs font-serif transition-all cursor-pointer ${
                          selectedPopperOption === opt.id
                            ? 'border-red-600 bg-red-50/80 font-bold text-red-950 ring-1 ring-red-400'
                            : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-800'
                        }`}
                      >
                        {opt.text}
                      </button>

                      {selectedPopperOption === opt.id && (
                        <div
                          className={`p-2.5 rounded-lg text-[11px] font-sans leading-relaxed animate-in fade-in ${
                            opt.score > 80
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              : 'bg-red-50 text-red-900 border border-red-200'
                          }`}
                        >
                          {opt.verdict}
                          {opt.score > 80 && (
                            <div className="mt-1 font-bold text-emerald-800 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              <span>恭喜！你已掌握波普尔可证伪性思维精髓，反忽悠能力提升！</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-red-950 font-serif font-bold leading-relaxed">
              “{trendData.invalidation}”
            </p>
            <p className="text-[11px] text-red-800/80 font-sans">
              * 承诺不模糊：一旦现实中监测到上述反向信号发生，本研判将视为彻底失效，系统将主动标记并记入回测负反馈。
            </p>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* 【全新重磅】Tetlock 概率置信度滑块与 Brier 个人校准调校 */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-serif font-bold text-stone-900">
                  Tetlock 概率置信度调校（Superforecasting Brier 校准）
                </span>
                {/* 理论原理按钮 */}
                <button
                  type="button"
                  onClick={() => setActiveTheoryKey('tetlock-superforecasting')}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-300 transition-colors cursor-pointer"
                  title="查看 Tetlock 超级预测学与 Brier 校准说明"
                >
                  <BookOpen className="w-3 h-3 text-stone-500" />
                  <span>理论原理</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-mono">我的主观胜率估计：</span>
                <span className="text-base font-serif font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {confidenceProb}%
                </span>
              </div>
            </div>

            {/* 概率滑块 */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={confidenceProb}
                onChange={(e) => setConfidenceProb(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] font-mono text-stone-400">
                <span>10% (极度审慎/可能落空)</span>
                <span>50% (中立博弈五五开)</span>
                <span>90% (极高确定性/重仓确信)</span>
              </div>
            </div>

            {/* 校准提示与 Brier 风险感知 */}
            <div className="text-xs font-serif rounded-lg p-2.5 flex items-center justify-between gap-3 bg-white border border-stone-200/80">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="text-stone-700">
                  {confidenceProb > 80 ? (
                    <span className="text-amber-800 font-bold">
                      ⚠️ 高置信预警：自信度过高时若被证伪，Brier 偏差惩罚将翻倍。请确认是否有铁证。
                    </span>
                  ) : confidenceProb >= 55 ? (
                    <span className="text-emerald-800 font-bold">
                      ✅ 科学审慎区间：符合超级预测者 (Superforecasters) 严谨概率分布，攻守兼备。
                    </span>
                  ) : (
                    <span className="text-purple-800 font-bold">
                      🛡️ 反向做空押注：判定基准演进大概率落空，将以做空视角计入回测账本。
                    </span>
                  )}
                </span>
              </div>

              {/* 微信异动订阅小开关 */}
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-stone-600 select-none shrink-0">
                <input
                  type="checkbox"
                  checked={wechatNotifyEnabled}
                  onChange={(e) => setWechatNotifyEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <BellRing className="w-3.5 h-3.5 text-stone-400" />
                <span>微信异动提醒</span>
              </label>
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

      {/* 理论精解说明弹窗 */}
      <TheoryExplainerModal
        theoryKey={activeTheoryKey}
        onClose={() => setActiveTheoryKey(null)}
      />
    </section>
  );
};
