import React from 'react';
import { X, BookOpen, ShieldCheck, Sparkles, Brain, Award, ArrowRight, ExternalLink } from 'lucide-react';

export type TheoryKey = 
  | 'cia-ach'              // CIA ACH 竞争性假设分析
  | 'alphasense-quant'     // AlphaSense 定量对冲锚点
  | 'groundnews-blindspot' // Ground News 媒体沉默盲区
  | 'popper-falsification' // 波普尔可证伪性原则
  | 'tetlock-superforecasting' // Tetlock 超级预测与 Brier 校准
  | 'kahneman-system2';    // 卡尼曼系统 2 脱水思考

export interface TheoryDetail {
  key: TheoryKey;
  badge: string;
  title: string;
  source: string;
  coreQuestion: string;
  whyBrainFails: string;
  actionPrinciple: string;
  quote: string;
  cognitiveGymExercise: string;
}

export const THEORIES_REGISTRY: Record<TheoryKey, TheoryDetail> = {
  'cia-ach': {
    key: 'cia-ach',
    badge: '情报分析顶峰',
    title: 'CIA 竞争性假设分析法 (ACH)',
    source: 'Richards J. Heuer Jr., 原 CIA 资深方法论专家《情报分析心理学》(1999)',
    coreQuestion: '为什么寻找反方漏洞，比寻找支持证据重要十倍？',
    whyBrainFails: '人类大脑天生具备极强的“证实偏差 (Confirmation Bias)”。一旦我们潜意识对某个企业、股票或人物有好感，就会本能地搜集赞美之词，而将所有负面预警视而不见，最终在暴雷时沦为牺牲品。',
    actionPrinciple: '强制列出相互对立的假设，并专门搜集“能够推翻主流叙事的反面证据”。如果一个主流观点连最苛刻的反方做空挑刺都能抗住，它才具有极高的安全边际。',
    quote: '“真正的情报高手，不是证明自己有多聪明，而是千方百计证明自己哪里可能看走眼。”',
    cognitiveGymExercise: '每当你迫切想投资或看好某个大事件时，强迫自己说出做空对手的 3 个最恶毒做空理由。如果你说不出来，说明你已经陷入了信息茧房。',
  },
  'alphasense-quant': {
    key: 'alphasense-quant',
    badge: '华尔街顶级投研',
    title: 'AlphaSense 定量指标对冲法',
    source: '华尔街量化与定性混合投研标准 (AlphaSense / Bloomberg)',
    coreQuestion: '如何识破公关通稿与管理层画大饼？',
    whyBrainFails: '文字极易被华丽的修辞、叙事宏大感包装。人们很容易被“万亿级蓝海市场”、“划时代革命”等煽动性形容词俘虏，却忽略了底层的物理约束与财务真实性。',
    actionPrinciple: '用硬核数据锚点（如 CapEx 资本开支增速、硬件交付交期 Lead Time、现金流造血比率）直接对冲文字论述。文字可以说谎，但现金流和供应链交期无法撒谎。',
    quote: '“在商业世界，算力、产能与自由现金流是硬约束，其余多是文学创作。”',
    cognitiveGymExercise: '阅读任何重磅消息时，不要只看公关部说了什么，立刻去寻找“该事件对应的领先量化指标是上升还是下降了”。',
  },
  'groundnews-blindspot': {
    key: 'groundnews-blindspot',
    badge: '媒体生态学',
    title: 'Ground News 媒体沉默盲区透视 (Blindspot)',
    source: '芝加哥大学 / 哈佛大学 Matthew Gentzkow 教授《媒体偏见与声誉机制》',
    coreQuestion: '当所有人都在报道时，如何发现谁在故意装聋作哑？',
    whyBrainFails: '人们通常只关注“眼前出现的新闻”（心理学称 WYSIATI 偏差：你所看到的就是全部）。但最有价值的战略情报，往往隐藏在“某一方群体为什么集体保持反常沉默”之中。',
    actionPrinciple: '统计不同利益阵营（官方权威、商业投行、一线供应链、垂直自媒体）的发稿比例。当某类关键利益群体发稿率异常偏低时，往往代表存在商业保密协议 (NDA) 限制、内部利益纠葛或暴雷前兆。',
    quote: '“夏洛克·福尔摩斯的破案关键，往往是那只在凶案发生当晚没有叫唤的看门狗。”',
    cognitiveGymExercise: '当全网都在跟风炒作一个大概念时，看一下上下游一线实干企业的发声情况。如果一线工人与供应商一片寂静，警惕虚火。',
  },
  'popper-falsification': {
    key: 'popper-falsification',
    badge: '科学哲学基石',
    title: '波普尔可证伪性原则 (Falsificationism)',
    source: '20 世纪最伟大科学哲学家卡尔·波普尔 (Karl Popper)《猜想与反驳》',
    coreQuestion: '为什么无法被证明是错的预测，在科学上是毫无价值的算命巫术？',
    whyBrainFails: '算命先生的套话（如“短期有波动但长期看好”）永远立于不败之地。这种话术让人获得虚假的安全感，但在真实商业博弈中无法提供任何决策指导。',
    actionPrinciple: '每一个严肃的预测，必须在事前白纸黑字写明「证伪失效红线」——明确指出“未来发生何种具体反向事实，本套研判立即推翻”。敢于承认边界，才是科学。',
    quote: '“一个不能被任何可以想象的事件驳倒的理论，不是科学，而是神棍巫术。”',
    cognitiveGymExercise: '在做任何重要决定前，拿出一张纸写下一句话：“如果 3 个月后发生_____，我就承认自己判断失误并立刻止损割肉”。',
  },
  'tetlock-superforecasting': {
    key: 'tetlock-superforecasting',
    badge: 'IARPA 超级预测学',
    title: 'Tetlock 狐狸型概率校准与 Brier 评分',
    source: '宾夕法尼亚大学 Philip Tetlock 教授《超级预测》(Superforecasting)',
    coreQuestion: '为什么顶尖预测大师从不把话说死，而是像狐狸一样调校概率？',
    whyBrainFails: '人类本能偏爱“非黑即白”的绝对断言（如“一定会暴涨”或“必然崩溃”）。这种“刺猬型”专家虽然在电视上很有煽动力，但在实证研究中，预测准确率甚至不如掷飞镖的猩猩。',
    actionPrinciple: '拥抱“狐狸型思维”：把世界看作概率分布，使用 10%~90% 的置信度来表达主观胜率，并随着新事实的到来微调概率；到期时使用 Brier Score 量化核算自己的“过度自信偏差”。',
    quote: '“狐狸懂得很多微小的事情，而刺猬只坚守一个宏大的教条。”',
    cognitiveGymExercise: '戒掉“必然”、“绝对”、“不可能”这三个词。强制改用百分比：“在当前证据下，我有 70% 的把握成立，30% 的概率被反向推翻”。',
  },
  'kahneman-system2': {
    key: 'kahneman-system2',
    badge: '行为经济学诺奖',
    title: '卡尼曼系统 2 脱水思维与消减噪声',
    source: '诺贝尔经济学奖得主丹尼尔·卡尼曼 (Daniel Kahneman)《思考，快与慢》',
    coreQuestion: '如何防止情绪化标题洗脑，启动冷静的系统 2 慢思考？',
    whyBrainFails: '现代自媒体算法专门收买人类大脑的“系统 1”（快思考），通过制造焦虑、恐慌或狂热来诱导点击。人在情绪激动时，智商会自动降到谷底。',
    actionPrinciple: '通过“极简脱水”机制，把形容词、感叹号、煽动性故事全部剥离，只保留冷酷的事实主谓宾与因果关系链，强制大脑调动耗能但理性的“系统 2”。',
    quote: '“我们极容易被眼前动听的故事所愚弄，除非我们强迫自己停下来计算事实骨架。”',
    cognitiveGymExercise: '遇到任何让你心跳加速、感到愤怒或狂喜的新闻时，先默念 3 秒：“这是事实，还是对方希望我产生的情绪？”然后切换至脱水模式。',
  },
};

interface TheoryExplainerModalProps {
  theoryKey: TheoryKey | null;
  onClose: () => void;
}

export const TheoryExplainerModal: React.FC<TheoryExplainerModalProps> = ({
  theoryKey,
  onClose,
}) => {
  if (!theoryKey) return null;
  const theory = THEORIES_REGISTRY[theoryKey];
  if (!theory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border-2 border-stone-900 shadow-2xl p-6 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                {theory.badge}
              </span>
              <span className="text-xs text-stone-500 font-mono">科学决策思维手册</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-black text-stone-950">
              {theory.title}
            </h3>
            <p className="text-xs text-stone-500 font-serif">
              学术来源：{theory.source}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 核心灵魂拷问 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1">
          <div className="text-xs font-mono font-bold uppercase text-amber-800 tracking-wider">
            灵魂拷问 · The Core Question
          </div>
          <p className="text-base font-serif font-bold text-amber-950">
            “{theory.coreQuestion}”
          </p>
        </div>

        {/* 双栏对比：大脑为何犯错 vs 科学行动法则 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif leading-relaxed">
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-red-950 text-sm">
              <Brain className="w-4 h-4 text-red-600" />
              <span>人类大脑的本能陷阱</span>
            </div>
            <p className="text-stone-700 font-sans leading-normal">
              {theory.whyBrainFails}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>专业情报官的破解法则</span>
            </div>
            <p className="text-stone-700 font-sans leading-normal">
              {theory.actionPrinciple}
            </p>
          </div>
        </div>

        {/* 大师箴言金句 */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-stone-800 font-serif italic text-xs sm:text-sm text-center">
          {theory.quote}
        </div>

        {/* 刻意练习健身房：如何在日常中训练这项技能 */}
        <div className="rounded-xl border-2 border-stone-900 bg-stone-900 text-stone-100 p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-xs">
              <Award className="w-4 h-4" />
              <span>思维刻意练习操（Deliberate Practice）</span>
            </div>
            <span className="text-[10px] font-mono text-stone-400">每日 1 次肌肉记忆训练</span>
          </div>
          <p className="text-xs sm:text-sm font-sans leading-relaxed text-stone-200">
            {theory.cognitiveGymExercise}
          </p>
        </div>

        {/* 底部按钮 */}
        <div className="pt-1 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-serif font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            我已掌握，返回研判实战
          </button>
        </div>
      </div>
    </div>
  );
};
