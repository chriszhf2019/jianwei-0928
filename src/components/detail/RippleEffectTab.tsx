import React from 'react';
import { RippleEffectData } from '../../types';
import { Waves, Network, ShieldCheck, CheckCircle2, Clock, Layers, ArrowRight } from 'lucide-react';
import { ripplePlain } from '../../utils/plainSummary';
import { PlainSay } from '../common/PlainSay';

interface RippleEffectTabProps {
  rippleEffect: RippleEffectData;
}

const STAGE_META: Record<string, { label: string; scope: string }> = {
  '一阶影响': { label: '一阶 · 直接影响', scope: '直接受冲击的主体' },
  '二阶影响': { label: '二阶 · 次级传导', scope: '供应链与市场的联动' },
  '三阶影响': { label: '三阶 · 结构重塑', scope: '政策、竞争与宏观格局' },
};

const KG_TYPE_LABEL: Record<string, string> = {
  company: '机构/企业',
  tech: '技术/协议',
  policy: '政策/规则',
  market: '市场/行业',
  person: '人物/决策者',
};

function severityClass(severity: string): string {
  if (severity === '高') return 'text-red-600';
  if (severity === '中') return 'text-amber-600';
  return 'text-stone-600';
}

export const RippleEffectTab: React.FC<RippleEffectTabProps> = ({ rippleEffect }) => {
  if (!rippleEffect) {
    return <div className="p-8 text-center text-stone-500 font-sans">暂无涟漪效应数据</div>;
  }

  return (
    <div className="space-y-8 font-sans">
      {/* 1. 一阶 / 二阶 / 三阶 涟漪效应 */}
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <Waves className="w-5 h-5 text-[#0284C7]" />
            <h3 className="text-base font-serif font-bold text-stone-950">
              涟漪效应与中长期传导推演 (Ripple Effects)
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">从短期波动到宏观重塑</span>
        </div>

        {/* 涟漪传导方法论：本质 / 功能 / 思路 */}
        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3.5 text-xs leading-relaxed text-stone-600 space-y-2">
          <div className="flex items-center gap-2 text-stone-900">
            <Layers className="w-4 h-4 text-[#0284C7]" />
            <span className="font-serif font-bold">涟漪传导方法论</span>
          </div>
          <div>
            <span className="font-serif font-bold text-stone-800">本质：</span>
            涟漪不是并列罗列，而是按时间递进、影响范围扩散的三圈传导：从直接冲击，到次级联动，再到结构与宏观重塑。
          </div>
          <div>
            <span className="font-serif font-bold text-stone-800">功能：</span>
            帮读者跳出“谁直接受损”，看清事件如何通过供应链、资本、政策和竞争格局继续向外扩散。
          </div>
          <div>
            <span className="font-serif font-bold text-stone-800">思路：</span>
            一阶回答“谁最先被影响”，二阶回答“会连锁到哪些环节”，三阶回答“长期会重塑什么”。timeframe 与 severity 是条件假设，不是概率。
          </div>
        </div>

        <PlainSay text={ripplePlain(rippleEffect)} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rippleEffect.stages.map((st, idx) => (
            <div
              key={st.stage}
              className="p-5 bg-stone-50 rounded-xl border-2 border-stone-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-xs text-stone-900 bg-stone-200 px-2 py-0.5 rounded">
                  {STAGE_META[st.stage]?.label || st.stage}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#0284C7] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {st.timeframe}
                </span>
              </div>

              <h4 className="text-sm font-serif font-bold text-stone-950">
                {st.title}
              </h4>

              <ul className="space-y-1.5 text-xs text-stone-700">
                {st.items.map((it, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-[#0284C7] font-bold">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-stone-200 text-[10px] text-stone-500 flex justify-between font-mono">
                <span>{STAGE_META[st.stage]?.scope || '传导范围'} · 影响强度：</span>
                <strong className={severityClass(st.severity)}>
                  {st.severity}
                </strong>
              </div>
            </div>
          ))}
        </div>

        {/* 一句话传导链与口径说明 */}
        {rippleEffect.stages.length > 0 && (
          <div className="space-y-2 border-t border-stone-200 pt-3">
            <div className="rounded-lg border-l-4 border-[#0284C7] bg-white px-3 py-2 text-xs leading-relaxed text-stone-700">
              <span className="font-serif font-bold text-stone-800">一句话传导链：</span>
              {rippleEffect.stages
                .map((stage) => `${stage.title}（${stage.timeframe}）`)
                .join(' → ')}
            </div>
            <p className="text-[10px] leading-relaxed text-stone-400">
              口径：一阶到三阶是“时间递进 + 影响范围扩散”的条件假设，不代表已发生的事实或概率预测；需与因果链、证据链和后续事实交叉验证。
            </p>
          </div>
        )}
      </div>

      {/* 2. 知识图谱关联实体 */}
      {rippleEffect.knowledgeGraph && rippleEffect.knowledgeGraph.length > 0 && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-serif font-bold text-stone-950">
                关联知识图谱节点 (Knowledge Graph)
              </h3>
            </div>
            <span className="text-xs text-stone-500 font-mono">实体与产业拓扑</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rippleEffect.knowledgeGraph.map((kg) => (
              <div key={kg.id} className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-serif font-bold text-purple-950">{kg.name}</span>
                  <span className="text-[10px] font-mono bg-purple-200/80 text-purple-900 px-1.5 py-0.2 rounded">
                    {KG_TYPE_LABEL[kg.type] || '关联实体'}
                  </span>
                </div>
                <p className="text-xs text-purple-900 font-sans">
                  <strong>关系定位：</strong>{kg.relationToMain}
                </p>
              </div>
              ))}
          </div>
          <p className="text-[10px] leading-relaxed text-stone-400">
            口径：知识图谱节点表示实体与产业的拓扑关系，用于定位相关方和传导范围，不代表因果关系或投资建议。
          </p>
        </div>
      )}

      {/* 3. AI 来源线索 */}
      {rippleEffect.multiSources && rippleEffect.multiSources.length > 0 && (
        <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-serif font-bold text-stone-950">
                AI 来源线索与摘录
              </h3>
            </div>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
              AI 生成 · 未联网核验
            </span>
          </div>

          <p className="text-[11px] text-stone-500 leading-relaxed">
            此处是模型对来源和引句的整理，不等于平台已经逐一打开原文核验。独立来源数量请以卡片或详情页的“可追溯性”徽标为准。
          </p>
          <p className="text-[10px] text-stone-400 leading-relaxed border-l-2 border-stone-200 pl-2">
            来源分级双口径说明：卡片来源徽标的「官方 A / 行业 B / 观点 C」为<b>人工媒体档案</b>；本表 Tier 1/2/3 为 <b>AI 自报标注</b>。两者都不是内容真假结论，且可能互相不一致。
          </p>

          <div className="space-y-3">
            {rippleEffect.multiSources.map((src, i) => (
              <div
                key={i}
                className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-serif font-bold text-stone-950">{src.sourceName}</span>
                    <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded">
                      {src.tier}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
                      立场: {src.stance}
                    </span>
                  </div>
                  <p className="text-stone-700 italic">
                    “{src.excerpt}”
                  </p>
                </div>

                {src.excerpt ? (
                  <div className="flex items-center space-x-1 text-emerald-600 font-bold shrink-0 self-end sm:self-auto">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>附引句</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-amber-600 font-bold shrink-0 self-end sm:self-auto">
                    <span>无引句</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
