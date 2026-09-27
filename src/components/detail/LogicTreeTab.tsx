import React, { useState, useMemo } from 'react';
import { LogicTreeData, VariableWeight } from '../../types';
import { 
  GitFork, 
  ArrowDown, 
  ArrowUp, 
  Minus, 
  Sparkles, 
  Layers, 
  Sliders, 
  RotateCcw, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { logicTreePlain } from '../../utils/plainSummary';
import { PlainSay } from '../common/PlainSay';

interface LogicTreeTabProps {
  logicTree: LogicTreeData;
}

type ScenarioType = 'base' | 'bull' | 'stress';

const CATEGORY_LABEL: Record<string, string> = {
  cause: '触发源 · 始发因',
  mid_effect: '传导机制 · 中间环节',
  market_impact: '市场终局 · 终端影响',
};

export const LogicTreeTab: React.FC<LogicTreeTabProps> = ({ logicTree }) => {
  if (!logicTree) {
    return <div className="p-8 text-center text-stone-500">暂无因果逻辑树数据</div>;
  }

  // State for dynamic What-If simulation weights
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    (logicTree.variableWeights || []).forEach(v => {
      initial[v.name] = v.weight;
    });
    return initial;
  });

  const [activeScenario, setActiveScenario] = useState<ScenarioType>('base');
  const [savedSnapshot, setSavedSnapshot] = useState(false);

  // Handle variable weight slider changes
  const handleSliderChange = (name: string, newVal: number) => {
    setActiveScenario('base'); // custom
    setWeights(prev => ({
      ...prev,
      [name]: newVal
    }));
    setSavedSnapshot(false);
  };

  // Scenario presets
  const applyScenario = (scenario: ScenarioType) => {
    setActiveScenario(scenario);
    setSavedSnapshot(false);
    const updated: Record<string, number> = {};
    const defaultList = logicTree.variableWeights || [];

    if (scenario === 'base') {
      defaultList.forEach(v => {
        updated[v.name] = v.weight;
      });
    } else if (scenario === 'bull') {
      // Bull Case: amplify positive drivers, reduce bottlenecks
      defaultList.forEach((v, idx) => {
        if (v.impactDirection === 'up') {
          updated[v.name] = Math.min(80, Math.round(v.weight * 1.5));
        } else if (v.impactDirection === 'down') {
          updated[v.name] = Math.max(10, Math.round(v.weight * 0.6));
        } else {
          updated[v.name] = v.weight;
        }
      });
    } else if (scenario === 'stress') {
      // Stress Case / Black Swan: amplify bottlenecks & regulatory drag
      defaultList.forEach((v) => {
        if (v.impactDirection === 'down' || v.name.includes('审批') || v.name.includes('合规') || v.name.includes('用工') || v.name.includes('通胀')) {
          updated[v.name] = Math.min(85, Math.round(v.weight * 1.8));
        } else {
          updated[v.name] = Math.max(15, Math.round(v.weight * 0.7));
        }
      });
    }
    setWeights(updated);
  };

  // Reset to default
  const handleReset = () => {
    applyScenario('base');
  };

  // 权重 → 冲击分 的纯函数（基准/当前/微扰共用同一口径）
  const scoreWeights = (w: Record<string, number>) => {
    const list = logicTree.variableWeights || [];
    let upWeightedTotal = 0;
    let downWeightedTotal = 0;
    let neutralTotal = 0;
    list.forEach(v => {
      const cur = w[v.name] ?? v.weight;
      if (v.impactDirection === 'up') upWeightedTotal += cur * 1.2;
      else if (v.impactDirection === 'down') downWeightedTotal += cur * 1.1;
      else neutralTotal += cur;
    });
    const netMomentum = upWeightedTotal - downWeightedTotal * 0.7 + neutralTotal * 0.05;
    return {
      shock: Math.min(99, Math.max(25, Math.round(50 + netMomentum * 0.4))),
      up: Math.round(upWeightedTotal),
      down: Math.round(downWeightedTotal),
    };
  };

  // 动态仿真输出：当前配置 vs 基准差分 + 最敏感变量 + 条件化结论
  const simulationMetrics = useMemo(() => {
    const defaultList = logicTree.variableWeights || [];
    const baseline: Record<string, number> = {};
    defaultList.forEach(v => { baseline[v.name] = v.weight; });

    if (defaultList.length === 0) {
      return {
        shockIndex: 75,
        delta: 0,
        direction: 'neutral' as 'bull' | 'bear' | 'neutral',
        speedShift: '按原节奏',
        rippleLevel: '连锁反应中等',
        aiVerdict: '各因素大致均衡，暂无明显的推动或阻力。',
        mostSensitive: [] as Array<{ name: string; impact: number }>,
        watchSignals: [] as string[],
        isCustom: false,
      };
    }

    const cur = scoreWeights(weights);
    const base = scoreWeights(baseline);
    const delta = cur.shock - base.shock;
    const isCustom = defaultList.some(v => (weights[v.name] ?? v.weight) !== v.weight);

    // 最敏感变量：对每个变量做 ±10% 微扰，取对冲击分影响最大的 Top3
    const sensitivity: Array<{ name: string; impact: number; dir: string }> = [];
    defaultList.forEach(v => {
      const up = scoreWeights({ ...weights, [v.name]: Math.min(95, (weights[v.name] ?? v.weight) + 10) });
      const down = scoreWeights({ ...weights, [v.name]: Math.max(5, (weights[v.name] ?? v.weight) - 10) });
      const impact = Math.abs(up.shock - down.shock);
      sensitivity.push({ name: v.name, impact, dir: v.impactDirection });
    });
    const mostSensitive = sensitivity
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(s => ({ name: s.name, impact: s.impact }));

    // 传导窗口与涟漪
    let speedShift = '按原节奏推进';
    let rippleLevel = '连锁反应一般';
    if (cur.shock >= 80) { speedShift = '提前 3-6 个月加速爆发'; rippleLevel = '连锁反应很剧烈'; }
    else if (cur.shock <= 45) { speedShift = '推迟 4-8 个月慢慢显现'; rippleLevel = '连锁反应较快平息'; }

    // 条件化结论（去指令化）：描述相对基准方向 + 让结论失效的条件
    const direction = delta > 8 ? 'bull' : delta < -8 ? 'bear' : 'neutral';
    const watchSignals = mostSensitive.map(s => s.name);
    const directionText = direction === 'bull' ? '比默认更乐观' : direction === 'bear' ? '比默认更悲观' : '与默认差不多';
    const verdictBase = isCustom
      ? `按你的调整：${directionText}，整体冲击 ${cur.shock} 分（默认 ${base.shock}，变化 ${delta > 0 ? '+' : ''}${delta}）。`
      : `当前是默认配置：整体冲击 ${cur.shock}/100。`;
    const signalHint = mostSensitive.length > 0
      ? `对结局影响最大的是「${mostSensitive[0].name}」；建议重点盯住：${mostSensitive.map(s => s.name).join('、')}。`
      : '';
    const falsify = watchSignals.length > 0
      ? `如果这些因素的走向和你的假设相反，这个结论就不成立，请回到默认或反过来做一次压力测试。`
      : '';
    const aiVerdict = `${verdictBase} ${signalHint} ${falsify}`.trim();

    return {
      shockIndex: cur.shock,
      baseShock: base.shock,
      delta,
      direction,
      speedShift,
      rippleLevel,
      aiVerdict,
      mostSensitive,
      watchSignals,
      isCustom,
    };
  }, [weights, logicTree]);

  // 情景说明（点预设时展示该情景的含义）
  const scenarioNote =
    activeScenario === 'bull'
      ? '乐观情形：利好因素放大到 1.5 倍、阻碍因素缩小到 0.6 倍'
      : activeScenario === 'stress'
        ? '最坏情形：政策、合规、用工、通胀等阻碍放大到 1.8 倍'
        : '默认：回到 AI 最初的判断';

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Causal Flow Nodes */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-[#E3120B]" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              事件根因与传导链路 (Causal Chain)
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">从始发因到终局影响</span>
        </div>

        {/* 因果链方法论：本质 / 功能 / 思路 */}
        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3.5 text-xs leading-relaxed text-stone-600 space-y-2">
          <div className="flex items-center gap-2 text-stone-900">
            <Layers className="w-4 h-4 text-purple-600" />
            <span className="font-serif font-bold">因果链方法论</span>
          </div>
          <div>
            <span className="font-serif font-bold text-stone-800">本质：</span>
            这不是时间线，也不是相关关系罗列，而是一条从“始发根因”到“终局影响”的有向传导链；每个节点必须回答“上一步如何推动下一步”。
          </div>
          <div>
            <span className="font-serif font-bold text-stone-800">功能：</span>
            把复杂事件拆成三层：触发源（根因）、传导机制（中间环节）、市场终局（终端影响），用来定位真正起作用的变量。
          </div>
          <div>
            <span className="font-serif font-bold text-stone-800">思路：</span>
            先问“为什么发生”，再问“通过什么机制扩散”，最后问“最终落到哪里”。变量权重只表达驱动因素的相对重要性与方向，不是发生概率。
          </div>
        </div>

        <PlainSay text={logicTreePlain(logicTree)} />

        {/* Root Cause Banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <span className="px-2 py-1 bg-red-600 text-white text-xs font-serif font-bold rounded shrink-0">
            始发根因 (Root Cause)
          </span>
          <span className="text-sm font-serif font-bold text-red-950 leading-snug">
            {logicTree.rootCause}
          </span>
        </div>

        {/* Transmission Nodes */}
        <div className="space-y-3 relative pl-4 border-l-2 border-stone-300 ml-4">
          {logicTree.nodes.map((node, idx) => {
            const isLast = idx === logicTree.nodes.length - 1;
            return (
              <div key={node.id} className="relative pl-6">
                <span className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isLast ? 'bg-[#E3120B]' : 'bg-stone-800'
                }`} />
                
                <div className={`p-4 rounded-xl border ${
                  isLast
                    ? 'bg-[#FAF8F5] border-[#E3120B] shadow-xs'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-serif font-bold text-stone-900">
                      节点 {idx + 1}：{node.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-stone-500 bg-stone-200 px-1.5 py-0.2 rounded">
                      {CATEGORY_LABEL[node.category] || '传导链'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed font-sans">
                    {node.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 一句话因果链与口径说明 */}
        {logicTree.nodes.length > 0 && (
          <div className="space-y-2 border-t border-stone-200 pt-3">
            <div className="rounded-lg border-l-4 border-red-400 bg-white px-3 py-2 text-xs leading-relaxed text-stone-700">
              <span className="font-serif font-bold text-stone-800">一句话因果链：</span>
              {logicTree.rootCause}
              {logicTree.nodes.map((node) => node.label).filter(Boolean).join(' → ') ? ' → ' : ''}
              {logicTree.nodes.map((node) => node.label).filter(Boolean).join(' → ')}
            </div>
            <p className="text-[10px] leading-relaxed text-stone-400">
              口径：这条链路是模型基于当前材料提出的“因果假设”，不代表已证实的事实；相关性不等于因果，需与证据链、独立来源和后续事实交叉验证。
            </p>
          </div>
        )}
      </div>

      {/* 2. Interactive What-If Simulation Sandbox (动态敏感度沙盒) */}
      <div className="bg-stone-950 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-900 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#E3120B] text-xs font-serif font-bold uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>情景推演沙盒 · 试试不同假设</span>
            </div>
            <h4 className="text-lg font-serif font-bold text-white">
              关键因素调节与最坏情况推演
            </h4>
            <p className="text-xs text-stone-400">
              拖动下面的滑块，调整每个因素的重要性，系统会立刻重新估算整体冲击、发酵快慢和连锁反应。
            </p>
            <p className="text-[10px] text-stone-500 leading-relaxed border-l-2 border-stone-700 pl-2">
              这里只回答“<b>哪个因素最关键、动一下会有什么变化</b>”，不预测概率。想看能回测的概率，去「人机预测擂台」；想知道“对我有什么影响”，去「与我何干 · 双向预测」。
            </p>
          </div>

          {/* Scenario quick presets */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => applyScenario('base')}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
                activeScenario === 'base'
                  ? 'bg-[#E3120B] text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              默认 (Base)
            </button>
            <button
              onClick={() => applyScenario('bull')}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
                activeScenario === 'bull'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              乐观 (Bull)
            </button>
            <button
              onClick={() => applyScenario('stress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all ${
                activeScenario === 'stress'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
              }`}
            >
              最坏情况 (Stress)
            </button>
            <button
              onClick={handleReset}
              title="恢复默认"
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 情景含义说明 */}
        <div className="text-[11px] text-stone-400 -mt-2 border-b border-stone-800/60 pb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{scenarioNote}</span>
          {simulationMetrics.isCustom && activeScenario === 'base' && (
            <span className="ml-auto font-mono text-amber-400">已手动调整（非默认）</span>
          )}
        </div>

        {/* Dynamic Simulation Output Metrics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-900/90 p-4 rounded-xl border border-stone-800">
          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-red-400" />
              <span>整体冲击程度</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-serif font-black text-amber-400 font-mono">
                {simulationMetrics.shockIndex}
              </span>
              <span className="text-xs text-stone-400">/ 100</span>
              {/* 差分 vs 基准 */}
              {(simulationMetrics as any).delta !== undefined && (
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    (simulationMetrics as any).delta > 0
                      ? 'bg-red-950/60 text-red-300'
                      : (simulationMetrics as any).delta < 0
                        ? 'bg-blue-950/60 text-blue-300'
                        : 'bg-stone-800 text-stone-400'
                  }`}
                  title={`相对默认值 ${(simulationMetrics as any).baseShock} 的变化`}
                >
                  {(simulationMetrics as any).delta > 0 ? '+' : ''}{(simulationMetrics as any).delta} 对比默认
                </span>
              )}
            </div>
            <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${simulationMetrics.shockIndex}%` }}
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>预计发酵时间</span>
            </div>
            <div className="text-sm sm:text-base font-serif font-bold text-white pt-1">
              {simulationMetrics.speedShift}
            </div>
            <div className="text-[10px] text-stone-400">按利好与阻碍的力量对比估算</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-stone-400 font-mono flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>连锁反应强弱</span>
            </div>
            <div className="text-sm sm:text-base font-serif font-bold text-emerald-400 pt-1">
              {simulationMetrics.rippleLevel}
            </div>
            <div className="text-[10px] text-stone-400">波及多个行业的程度</div>
          </div>
        </div>

        {/* AI Dynamic Simulation Verdict（条件化：方向 + 最敏感变量 + 失效条件） */}
        <div className="bg-stone-900 p-4 rounded-xl border-l-4 border-amber-400 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-serif font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>推演结论（本地粗略估算，结论带前提）</span>
          </div>
          <p className="text-xs sm:text-sm font-serif text-stone-200 leading-relaxed">
            {simulationMetrics.aiVerdict}
          </p>
          {/* 最敏感变量 Top3 */}
          {simulationMetrics.mostSensitive && simulationMetrics.mostSensitive.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-stone-400">对结局影响最大的因素：</span>
              {simulationMetrics.mostSensitive.map((s, i) => (
                <span
                  key={s.name}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    i === 0 ? 'bg-red-950/70 text-red-300 border-red-800' : 'bg-stone-800 text-stone-300 border-stone-700'
                  }`}
                  title={`小幅调整 ±10% 会让冲击程度变化约 ${s.impact} 点`}
                >
                  {s.name} · 动 ±10% 影响 {s.impact} 点
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Variable Sliders Grid */}
        <div className="space-y-4 pt-2">
          <div className="text-xs font-mono text-stone-400 uppercase tracking-wider">
            调整各因素的重要性 (0% - 100%)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(logicTree.variableWeights || []).map((v) => {
              const currentWeight = weights[v.name] ?? v.weight;
              const isModified = currentWeight !== v.weight;

              return (
                <div 
                  key={v.name}
                  className={`p-4 rounded-xl border transition-all ${
                    isModified 
                      ? 'bg-stone-900 border-amber-500/60 shadow-xs' 
                      : 'bg-stone-900/60 border-stone-800'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 font-serif font-bold text-white">
                      <span>{v.name}</span>
                      {v.impactDirection === 'up' && <ArrowUp className="w-3.5 h-3.5 text-red-400" />}
                      {v.impactDirection === 'down' && <ArrowDown className="w-3.5 h-3.5 text-blue-400" />}
                      {v.impactDirection === 'neutral' && <Minus className="w-3.5 h-3.5 text-stone-400" />}
                    </div>

                    <div className="flex items-center space-x-2">
                      {isModified && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                          已调整
                        </span>
                      )}
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {currentWeight}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="5"
                    value={currentWeight}
                    onChange={(e) => handleSliderChange(v.name, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#E3120B]"
                  />

                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span className="truncate max-w-[200px]">{v.description}</span>
                    <span className="font-mono text-[10px] text-stone-500">
                      默认: {v.weight}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Snapshot / Action row */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
          <span className="text-stone-400 text-[11px]">
            这是一个简单的估算沙盒（不是真正的 AI 模型），调整后立刻重新计算
          </span>
          <button
            onClick={() => setSavedSnapshot(true)}
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg flex items-center space-x-1.5 transition-colors font-serif"
          >
            {savedSnapshot ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">已标记（仅本次会话有效）</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>标记当前方案</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
