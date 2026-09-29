import React, { useState } from 'react';

import { useEscapeClose } from '../hooks/useEscapeClose';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  ShieldCheck, 
  Layers, 
  Radio, 
  Compass, 
  GitCommit, 
  Workflow, 
  TrendingUp, 
  UserCheck, 
  Sparkles, 
  ArrowRight, 
  X,
  Flame,
  FileText,
  Calendar,
  EyeOff,
  Scale,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Database,
  MapPin,
  Eye
} from 'lucide-react';
import { PrimaryNavTab } from '../types';

interface CognitiveModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: PrimaryNavTab) => void;
}

export const CognitiveModelModal: React.FC<CognitiveModelModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  useEscapeClose(isOpen, onClose);
  const [selectedLayer, setSelectedLayer] = useState<number>(0);

  const layers = [
    {
      id: 0,
      code: 'L0',
      name: '信源摄入与验真层 (Signal & Verification)',
      tagline: '去伪存真 · 交叉仲裁 · 打破茧房',
      color: 'border-emerald-600 bg-emerald-50 text-emerald-950',
      badgeColor: 'bg-emerald-600 text-white',
      accentColor: 'text-emerald-700',
      coreValue: '把运行时语料拆成来源、事实线索、相反观点和公开启发式指标，并为 AI 推断保留清晰边界，避免把模型输出当成“绝对可靠的事实”。',
      features: [
        {
          title: '信源可追溯性与完整度',
          desc: '展示原文链接、发布时间、来源构成与已知集团覆盖；不合成单一“综合健康分”，避免伪精确。',
          tabTarget: 'intelligence' as PrimaryNavTab,
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />
        },
        {
          title: '实时信源冲突仲裁',
          desc: '对多方报道的矛盾表述做证据与立场整理；模型自评分仅供排序，不作为真假裁决。',
          tabTarget: 'intelligence' as PrimaryNavTab,
          icon: <Workflow className="w-4 h-4 text-emerald-600" />
        },
        {
          title: '信息完整性与盲区审计',
          desc: '检测算法推荐导致的行业认知死角（如主流媒体遗漏的半导体上游材料危机），主动修补。',
          tabTarget: 'intelligence' as PrimaryNavTab,
          icon: <EyeOff className="w-4 h-4 text-emerald-600" />
        }
      ]
    },
    {
      id: 1,
      code: 'L1',
      name: '事实解构与降噪层 (Fact Deconstruction & Framing)',
      tagline: '5W1H 解构 · 三态排版 · 零门槛透视',
      color: 'border-blue-600 bg-blue-50 text-blue-950',
      badgeColor: 'bg-blue-600 text-white',
      accentColor: 'text-blue-700',
      coreValue: '对单篇新闻剥离情绪煽动与冗余废话，提炼标准事实七要素，并支持不同认知习惯的平滑适配。',
      features: [
        {
          title: '新闻七要素与 AI 解读',
          desc: '结构化拆解 What, Who, When, Where, Why, How 与关键的 So What，并区分事实、推断与未校准的模型自评分。',
          tabTarget: 'home' as PrimaryNavTab,
          icon: <GitCommit className="w-4 h-4 text-blue-600" />
        },
        {
          title: '三态认知排版 (标准 / 通俗 / 脱水)',
          desc: '专业报刊流、生活化比喻通俗模式（术语穿透解释）与 3 条转变极速脱水模式自由切换。',
          tabTarget: 'home' as PrimaryNavTab,
          icon: <FileText className="w-4 h-4 text-blue-600" />
        },
        {
          title: '全天候投递解析 (URL / 文本)',
          desc: '任意投递一篇外部资讯，即时调用底层大模型跑通整套见微认知解构流水线。',
          tabTarget: 'home' as PrimaryNavTab,
          icon: <Sparkles className="w-4 h-4 text-blue-600" />
        }
      ]
    },
    {
      id: 2,
      code: 'L2',
      name: '拓扑关联与态势感知层 (Topology & Macro Synthesis)',
      tagline: '因果网络 · 涟漪扩散 · 宏观演进脉络',
      color: 'border-amber-600 bg-amber-50 text-amber-950',
      badgeColor: 'bg-amber-600 text-white',
      accentColor: 'text-amber-700',
      coreValue: '拒绝把新闻当孤岛。通过因果逻辑树、实体知识图谱、涟漪效应与长周期专题，将点状事件织成动态宏观大网。',
      features: [
        {
          title: '逻辑溯源因果树 & 变量权重',
          desc: '始发诱因 → 产业链传导 → 终端影响三级回溯，定量展示关键驱动变量影响权重。',
          tabTarget: 'topics' as PrimaryNavTab,
          icon: <Network className="w-4 h-4 text-amber-600" />
        },
        {
          title: '涟漪效应 (一阶/二阶/三阶影响)',
          desc: '推演从即时市场震荡（一阶），传导至供应链洗牌（二阶）与地缘监管重构（三阶）。',
          tabTarget: 'topics' as PrimaryNavTab,
          icon: <TrendingUp className="w-4 h-4 text-amber-600" />
        },
        {
          title: '长周期专题档案库 & 24H热力矩阵',
          desc: '跨越数月的重大结构性博弈演进时间轴，以及 24 小时全网赛道情绪分时热力矩阵。',
          tabTarget: 'intelligence' as PrimaryNavTab,
          icon: <Flame className="w-4 h-4 text-amber-600" />
        }
      ]
    },
    {
      id: 3,
      code: 'L3',
      name: '决策映射与行动闭环层 (Actionable Decision Loop)',
      tagline: '与我何干 · 身份透镜 · 预警与行动',
      color: 'border-red-600 bg-red-50 text-red-950',
      badgeColor: 'bg-[#E3120B] text-white',
      accentColor: 'text-[#E3120B]',
      coreValue: '认知终点必须是决策与行动。为 6 大身份定制专属机会/威胁评估，建立动态监控雷达与明日预测闭环。',
      features: [
        {
          title: '六大身份透镜 (与我何干)',
          desc: '一键切换投资者、管理者、创业者、产品经理、工程师、销售市场专属影响矩阵与行动清单。',
          tabTarget: 'my_focus' as PrimaryNavTab,
          icon: <UserCheck className="w-4 h-4 text-[#E3120B]" />
        },
        {
          title: '雷达关键词异动监控 & 备忘录',
          desc: '实时盯防关注实体的异常声量与情绪转折，即时沉淀研判笔记与决策待办。',
          tabTarget: 'my_focus' as PrimaryNavTab,
          icon: <Radio className="w-4 h-4 text-[#E3120B]" />
        },
        {
          title: '明天点名 (明日爆发概率预测)',
          desc: '基于前序因果线索与日历周期计算，提前锁定明日确定性重大事件与潜在灰犀牛。',
          tabTarget: 'intelligence' as PrimaryNavTab,
          icon: <Calendar className="w-4 h-4 text-[#E3120B]" />
        }
      ]
    },
    {
      id: 4,
      code: 'L4',
      name: '概率校准与防篡改账本层 (Calibration & Superforecasting)',
      tagline: '拒绝事后诸葛亮 · Brier 校准 · 契约存证',
      color: 'border-purple-600 bg-purple-50 text-purple-950',
      badgeColor: 'bg-purple-600 text-white',
      accentColor: 'text-purple-700',
      coreValue: '让预测拥有确定性的复盘闭环。预测下注即锁定哈希时间戳与不可逆记录，到期后根据客观事实判定，持续校准认知偏差。',
      features: [
        {
          title: '预测防篡改账本 (Prediction Ledger)',
          desc: '创建后不可覆盖、到期只能锁定裁决一次，保证预测可信度与合规存证。',
          tabTarget: 'my_focus' as PrimaryNavTab,
          icon: <ShieldCheck className="w-4 h-4 text-purple-600" />
        },
        {
          title: 'Brier 分数与概率校准分桶',
          desc: '严格以 Brier 分数和 Log Loss 评估预测胜率，直观识别过度自信与过度悲观。',
          tabTarget: 'my_focus' as PrimaryNavTab,
          icon: <Workflow className="w-4 h-4 text-purple-600" />
        },
        {
          title: '前置失效红线触发监控',
          desc: '为每一个核心推论建立前置反转指标，一旦关键条件触发即时预警。',
          tabTarget: 'home' as PrimaryNavTab,
          icon: <GitCommit className="w-4 h-4 text-purple-600" />
        }
      ]
    }
  ];

  const [activeView, setActiveView] = useState<'layers' | 'diagram'>('diagram');

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        key="cognitive-model"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs font-sans overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.18 } }}
      >
      <div className="bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-stone-900 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-[#E3120B] text-white text-[10px] font-mono font-bold uppercase rounded">
                Genway Cognitive Paradigm
              </span>
              <span className="text-xs font-mono text-stone-500">统一认知与全景功能拓扑图</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-950">
              「见微」全景决策中枢与系统数据流拓扑图
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
              新闻不是碎片化的标题，而是一个包含「信源摄入 → 验真去伪 → 渐进穿透 → 因果对撞 → 身份行动 → 防篡改校准」的完整闭环外脑系统。
            </p>

            {/* View Switcher: Diagram vs Hierarchy */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveView('diagram')}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'diagram'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>全景系统数据流图 (Visual Architecture Flow)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('layers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'layers'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                <span>五阶十五层认知阶梯 (Cognitive Hierarchy)</span>
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-950 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeView === 'diagram' ? (
          /* ────────────────────────────────────────────────────────── */
          /* 全景系统功能拓扑与数据流图 (Visual Architecture Flow) */
          /* ────────────────────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="bg-stone-900 text-stone-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                  SYSTEM ARCHITECTURE & INTELLIGENCE PIPELINE
                </span>
                <h3 className="text-base font-serif font-black text-white mt-0.5">
                  见微 6 步决策引擎数据流动拓扑
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-300">
                <span className="inline-flex items-center gap-1 bg-stone-800 px-2 py-1 rounded border border-stone-700">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  零幻觉保真
                </span>
                <span className="inline-flex items-center gap-1 bg-stone-800 px-2 py-1 rounded border border-stone-700">
                  <Scale className="w-3 h-3 text-red-400" />
                  红蓝对抗
                </span>
                <span className="inline-flex items-center gap-1 bg-stone-800 px-2 py-1 rounded border border-stone-700">
                  <Database className="w-3 h-3 text-purple-400" />
                  防篡改账本
                </span>
              </div>
            </div>

            {/* 6-Step Visual Flow Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Step 1 */}
              <div className="bg-white rounded-xl p-4 border-2 border-emerald-200 hover:border-emerald-500 transition-all space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                    01 · 源端摄入
                  </span>
                  <Database className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="font-serif font-black text-sm text-stone-950">
                  全球信源与去重收敛
                </h4>
                <ul className="text-xs text-stone-600 space-y-1 font-sans">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                    <span>多源 RSS/Atom 抓取 + 外部 URL 投递</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                    <span><strong>母公司集团归一</strong>：通稿收敛为单一来源</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                    <span>报道阵营审计：谁在密集报道，谁在沉默</span>
                  </li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-xl p-4 border-2 border-blue-200 hover:border-blue-500 transition-all space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    02 · 验真降噪
                  </span>
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-serif font-black text-sm text-stone-950">
                  事实锚定与反片汤话
                </h4>
                <ul className="text-xs text-stone-600 space-y-1 font-sans">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    <span><strong>SSRF 防御</strong>：阻断内网 IP、私网伪造</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    <span><strong>原文引句指纹对比</strong>：严防断章取义</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    <span><code>ANTI_FLUFF</code> 公理：清除万能废话</span>
                  </li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-xl p-4 border-2 border-amber-200 hover:border-amber-500 transition-all space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    03 · 交付穿透
                  </span>
                  <Zap className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="font-serif font-black text-sm text-stone-950">
                  3秒 ➔ 30秒 ➔ 3分钟穿透
                </h4>
                <ul className="text-xs text-stone-600 space-y-1 font-sans">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                    <span><strong>3秒脉冲</strong>：一句话定调 + 损益警报</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                    <span><strong>30秒要害</strong>：硬核依据 + 红蓝多空 + 失效红线</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                    <span><strong>3分钟全景</strong>：完整因果链与拓扑展开</span>
                  </li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-xl p-4 border-2 border-rose-200 hover:border-rose-500 transition-all space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-900 px-2 py-0.5 rounded">
                    04 · 深度对抗
                  </span>
                  <Scale className="w-4 h-4 text-rose-600" />
                </div>
                <h4 className="font-serif font-black text-sm text-stone-950">
                  因果树与红蓝博弈
                </h4>
                <ul className="text-xs text-stone-600 space-y-1 font-sans">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                    <span><strong>因果逻辑树</strong>：始发根因 ➔ 产业链传导</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                    <span><strong>红蓝对抗天平</strong>：多空论据 + 力量强弱读数</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                    <span><strong>三阶涟漪效应</strong>：即时震荡 ➔ 洗牌 ➔ 宏观重构</span>
                  </li>
                </ul>
              </div>

              {/* Step 5 */}
              <div className="bg-white rounded-xl p-4 border-2 border-teal-200 hover:border-teal-500 transition-all space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded">
                    05 · 决策映射
                  </span>
                  <UserCheck className="w-4 h-4 text-teal-600" />
                </div>
                <h4 className="font-serif font-black text-sm text-stone-950">
                  身份透镜与防线盯盘
                </h4>
                <ul className="text-xs text-stone-600 space-y-1 font-sans">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                    <span><strong>六大决策透镜</strong>：投资/管理/技术/销售切片</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                    <span><strong>业务资产防线</strong>：上游材料、客户依赖雷达</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                    <span><strong>明天点名</strong>：重大节点灰犀牛预警</span>
                  </li>
                </ul>
              </div>

              {/* Step 6 */}
              <div className="bg-white rounded-xl p-4 border-2 border-purple-200 hover:border-purple-500 transition-all space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                    06 · 终局进化
                  </span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-serif font-black text-sm text-stone-950">
                  防篡改账本与校准进化
                </h4>
                <ul className="text-xs text-stone-600 space-y-1 font-sans">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                    <span><strong>防篡改账本</strong>：SHA-256 哈希存证，拒绝事后改口</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                    <span><strong>Brier Score 回测</strong>：严格计算概率准确度</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                    <span><strong>魔鬼代言人</strong>：针对个人偏误强制反向测试</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Navigation CTA to Modules */}
            <div className="bg-stone-100 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-serif">
              <span className="text-stone-700 font-bold">
                快速前往核心功能模块体验：
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { onNavigateTab('home'); onClose(); }}
                  className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded font-bold text-stone-900 cursor-pointer"
                >
                  ⚡ 首页 3-30-3 决策穿透
                </button>
                <button
                  onClick={() => { onNavigateTab('intelligence'); onClose(); }}
                  className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded font-bold text-stone-900 cursor-pointer"
                >
                  🔥 今日情报脉搏 & 盲区
                </button>
                <button
                  onClick={() => { onNavigateTab('topics'); onClose(); }}
                  className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded font-bold text-stone-900 cursor-pointer"
                >
                  🌳 专题档案与因果树
                </button>
                <button
                  onClick={() => { onNavigateTab('my_focus'); onClose(); }}
                  className="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded font-bold text-stone-900 cursor-pointer"
                >
                  🎯 我的关注与预测校准账本
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ────────────────────────────────────────────────────────── */
          /* 五阶十五层认知阶梯视图 (Cognitive Hierarchy) */
          /* ────────────────────────────────────────────────────────── */
          <div className="space-y-5">
            {/* 5-Stage Horizontal Pipeline Visualizer */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {layers.map((l, idx) => {
                const isSelected = selectedLayer === idx;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLayer(idx)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-stone-950 bg-stone-900 text-white shadow-md scale-[1.02]'
                        : 'border-stone-300 bg-white text-stone-900 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-stone-800 text-stone-200' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {l.code}
                      </span>
                      <span className="text-[11px] font-serif font-bold text-stone-400">
                        第 {idx + 1} 阶
                      </span>
                    </div>
                    <div className="text-xs font-serif font-bold line-clamp-1">
                      {l.name.split(' ')[0]}
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-1 ${
                      isSelected ? 'text-stone-300' : 'text-stone-500'
                    }`}>
                      {l.tagline}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Layer Deep Dive Showcase */}
            {(() => {
              const current = layers[selectedLayer] || layers[0];
              return (
                <div className={`border-2 rounded-2xl p-5 sm:p-6 space-y-5 ${current.color}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-300 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded font-mono text-xs font-bold ${current.badgeColor}`}>
                        {current.code}
                      </span>
                      <h3 className="text-lg font-serif font-black text-stone-950">
                        {current.name}
                      </h3>
                    </div>
                    <span className="text-xs font-serif font-bold text-stone-700">
                      {current.tagline}
                    </span>
                  </div>

                  {/* Core Value Statement */}
                  <div className="p-3.5 bg-white/80 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-800 font-serif leading-relaxed">
                    <strong>层级使命：</strong> {current.coreValue}
                  </div>

                  {/* Linked Features in this Layer */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {current.features.map((feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="bg-white p-4 rounded-xl border border-stone-300 hover:border-stone-900 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-1.5 font-serif font-bold text-xs text-stone-950">
                            {feat.icon}
                            <span>{feat.title}</span>
                          </div>
                          <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                            {feat.desc}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            onNavigateTab(feat.tabTarget);
                            onClose();
                          }}
                          className="inline-flex items-center space-x-1 text-xs font-serif font-bold text-stone-900 hover:text-[#E3120B] self-start pt-2 border-t border-stone-100 w-full cursor-pointer"
                        >
                          <span>前往该功能</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Anti-Fluff Delivery Axioms */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-serif font-black text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>见微交付公理：拒绝片汤话 · 有理有据 · 决策可落地</span>
            </div>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-bold">
              ANTI-FLUFF STANDARD
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs text-amber-900/90 font-serif">
            <div className="bg-white/80 border border-amber-200/60 rounded-lg p-3 space-y-1">
              <div className="font-bold text-stone-950 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                拒绝万能套话 ➔ 极度针对
              </div>
              <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                禁绝“机遇与挑战并存、保持审慎关注”等空话；必须指名道姓、具象落点到具体公司、产品与法规。
              </p>
            </div>
            <div className="bg-white/80 border border-amber-200/60 rounded-lg p-3 space-y-1">
              <div className="font-bold text-stone-950 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                拒绝无端断言 ➔ 讲清传导机制
              </div>
              <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                说明因果发生的物理或商业机制（如上游产能受限如何拉长交付、挤压利润），不把相关性当因果。
              </p>
            </div>
            <div className="bg-white/80 border border-amber-200/60 rounded-lg p-3 space-y-1">
              <div className="font-bold text-stone-950 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                拒绝凭空捏造 ➔ 证据原文锚定
              </div>
              <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                所有核心事实严格溯源至已核实的独立信源与原文引句；AI 推断严格标注，绝不把模型记忆包装成事实。
              </p>
            </div>
            <div className="bg-white/80 border border-amber-200/60 rounded-lg p-3 space-y-1">
              <div className="font-bold text-stone-950 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                拒绝假大空黑话 ➔ 透彻人话易懂
              </div>
              <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                用最接地气的生活化比喻和直给的大白话拆解复杂局面，让不同背景的决策者秒懂“对我意味着什么”。
              </p>
            </div>
          </div>
        </div>

        {/* Global Feedback Loop Matrix */}
        <div className="bg-stone-900 text-stone-200 p-5 rounded-xl space-y-3 font-sans">
          <div className="flex items-center space-x-2 text-xs font-serif font-bold text-red-400">
            <Workflow className="w-4 h-4" />
            <span>模块间网状联动闭环关系网 (Closed-Loop Synergy)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700">
              <div className="font-serif font-bold text-white mb-1">
                🔄 事实 ➔ 专题聚类
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                单点新闻自动汇聚成长周期专题时间轴，提供宏观历史纵深。
              </p>
            </div>
            <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700">
              <div className="font-serif font-bold text-white mb-1">
                ⚡ 异动 ➔ 证据溯源
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                24H 热力矩阵与盲区预警一键反查触发热度的核心原始报道。
              </p>
            </div>
            <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700">
              <div className="font-serif font-bold text-white mb-1">
                🎯 解构 ➔ 身份行动
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                新闻详情中的行动清单与关键实体，直接沉淀入「我的关注」与监控雷达。
              </p>
            </div>
            <div className="p-2.5 bg-stone-800 rounded-lg border border-stone-700">
              <div className="font-serif font-bold text-white mb-1">
                🔮 因果 ➔ 明日预测
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                五层光谱推演与因果变量权重，实时转化为「明天点名」的概率模型。
              </p>
            </div>
          </div>
        </div>
      </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
