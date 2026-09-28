import React, { useEffect, useState } from 'react';
import { NewsArticle, CognitiveDetailTab, UserPersona, UserPersonaId, PrimaryNavTab, PredictionContract } from '../../types';
import { TOPIC_CLUSTERS } from '../../data/intelligenceData';
import { SevenElementsTab } from './SevenElementsTab';
import { EntityCheckTab } from './EntityCheckTab';
import { LogicTreeTab } from './LogicTreeTab';
import { RelevanceIdentityTab } from './RelevanceIdentityTab';
import { RippleEffectTab } from './RippleEffectTab';
import { DeepSpectrumTab } from './DeepSpectrumTab';
import { ForecastArenaTab } from './ForecastArenaTab';
import { DialecticalMatrixSection } from './DialecticalMatrixSection';
import { TrendScenarioSection } from './TrendScenarioSection';
import { KeyTermNote } from '../common/KeyTermHighlight';
import { FeatureSummary } from '../common/FeatureSummary';
import type { FeatureSummaryId } from '../../utils/featureSummaries';
import { EvidenceBadge } from '../common/EvidenceBadge';
import { formatArticleTime } from '../../utils/articleTime';
import { composeModel, SEVEN_W_ITEMS } from '../../utils/sevenElementsBrief';
import { downloadBriefingPng } from '../../utils/briefingImage';
import { CERTIFICATION_STANDARDS } from '../../utils/methodRegistry';
import { 
  ArrowLeft, 
  Bookmark, 
  Share2, 
  Bot, 
  Send, 
  RefreshCw, 
  Sparkles, 
  Printer, 
  Check,
  Download,
  FileImage,
  FileText,
  HelpCircle,
  Clock,
  Layers,
  Flame,
  GitFork,
  UserCheck,
  Waves,
  ArrowRight,
  Radio,
  BookOpen,
  Network,
  GitMerge,
  Crosshair,
  SearchCheck,
  ChevronDown,
  Zap,
  Scale,
  Compass,
  ShieldAlert,
  History,
  Target,
  Activity,
  CheckCircle2
} from 'lucide-react';

// 浅层外部信源条目缺少深度认知字段时的优雅占位
const MissingDeep: React.FC<{ feature: string; note?: string }> = ({ feature, note }) => (
  <div className="p-10 text-center bg-white border-2 border-dashed border-stone-300 rounded-2xl space-y-2">
    <p className="text-sm font-serif font-bold text-stone-700">本篇文章暂无「{feature}」深度认知数据</p>
    <p className="text-xs text-stone-500">
      {note ||
        '该条目来自外部信源浅层摄取；配置 GEMINI_API_KEY 后可通过 AI 懒加载补全（见 DATA_PIPELINE_DESIGN.md §4）。'}
    </p>
  </div>
);

// 将 /api/enrich 返回的深层字段合并进浅层文章（只取白名单字段）
type DeepMergeKeys =
  | 'sevenElements'
  | 'logicTree'
  | 'personaImpacts'
  | 'rippleEffect'
  | 'spectrumLayers'
  | 'evidenceChain'
  | 'industrySignals'
  | 'oneSentenceVerdict'
  | 'subtitle'
  | 'summary'
  | 'coreQuote'
  | 'quoteAuthor'
  | 'tongsuSummary'
  | 'dehydratedItems'
  | 'backstoryTimeline'
  | 'stakeholderImpact'
  | 'coreLogic'
  | 'bullBearDebate'
  | 'relatedNews'
  | 'personaForecasts'
  | 'aiFieldMeta';

function mergeDeep(article: NewsArticle, overrides: Record<string, unknown>): NewsArticle {
  const keys: DeepMergeKeys[] = [
    'sevenElements','logicTree','personaImpacts','rippleEffect','spectrumLayers',
    'evidenceChain','industrySignals','oneSentenceVerdict','subtitle','summary','coreQuote','quoteAuthor',
    'tongsuSummary','dehydratedItems','backstoryTimeline','stakeholderImpact','coreLogic','bullBearDebate','relatedNews','personaForecasts','aiFieldMeta',
  ];
  const next: NewsArticle = { ...article };
  for (const key of keys) {
    const value = overrides[key];
    if (value !== undefined && value !== null) {
      (next as any)[key] = value;
    }
  }
  return next;
}

interface NewsDetailViewProps {
  article: NewsArticle;
  onBack: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activePersona: UserPersona;
  onSelectPersona: (id: UserPersonaId) => void;
  onOpenTermExplain: (term: string) => void;
  onNavigateTab?: (tab: PrimaryNavTab) => void;
  onSaveContract?: (contract: PredictionContract) => Promise<boolean>;
  onEnrichArticle?: (updated: NewsArticle) => void;
  /** 按需技能（timeline 等） */
  onRunSkill?: (skill: import('../home/HomeView').NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 身份化「正反双向预测」 */
  onRunPersonaForecast?: (persona: UserPersona, article: NewsArticle) => Promise<NewsArticle | null>;
  /** 相关新闻：语料池与打开其它文章 */
  contextArticles?: NewsArticle[];
  onOpenArticle?: (article: NewsArticle) => void;
  onOpenShareCard?: (article: NewsArticle) => void;
}

export const NewsDetailView: React.FC<NewsDetailViewProps> = ({
  article,
  onBack,
  isBookmarked,
  onToggleBookmark,
  activePersona,
  onSelectPersona,
  onOpenTermExplain,
  onNavigateTab,
  onSaveContract,
  onEnrichArticle,
  onRunSkill,
  onRunPersonaForecast,
  contextArticles,
  onOpenArticle,
  onOpenShareCard,
}) => {
  const [activeTab, setActiveTab] = useState<CognitiveDetailTab>('seven_elements');
  const [viewMode, setViewMode] = useState<'brief' | 'workbench'>('workbench');
  const [workbenchStep, setWorkbenchStep] = useState<'facts' | 'debate' | 'identity' | 'future'>('facts');
  const [factsSubTab, setFactsSubTab] = useState<'seven' | 'timeline' | 'entity' | 'logic' | 'spectrum'>('seven');
  const [probeQuestion, setProbeQuestion] = useState('');
  const [probeAnswer, setProbeAnswer] = useState<string | null>(null);
  const [probeFallback, setProbeFallback] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [showProbe, setShowProbe] = useState(false);
  const [introExpanded, setIntroExpanded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const root = document.documentElement;
      const total = root.scrollHeight - window.innerHeight;
      setReadingProgress(total > 0 ? Math.max(0, Math.min(100, (window.scrollY / total) * 100)) : 0);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [article.id]);

  // 简报卡“下载 / 打印 PDF”：临时给 body 挂 printing 类，打印样式只保留 #briefing-sheet
  const handlePrintBriefing = () => {
    setShowPrintCard(true);
    const cleanup = () => {
      document.body.classList.remove('printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // 等渲染出卡片后挂上打印类再触发打印（打印样式只保留 #briefing-sheet）
    setTimeout(() => {
      document.body.classList.add('printing');
      window.print();
      // 兜底清理：个别浏览器不派发 afterprint
      setTimeout(cleanup, 60000);
    }, 120);
  };

  // —— 浅层外部信源条目：深层认知 AI 懒加载补全 ——
  const isShallow = !article.spectrumLayers || article.spectrumLayers.length === 0;
  const [enrichPhase, setEnrichPhase] = useState<'idle' | 'loading' | 'done' | 'unavailable' | 'error'>('idle');

  const handleGenerateDeepAnalysis = async () => {
    if (!isShallow || enrichPhase === 'loading') return;
    setEnrichPhase('loading');
    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          title: article.title,
          content: article.summary || article.subtitle || article.title,
          source: article.sourceName,
          sourceUrl: article.sourceUrl || '',
          publishedAt: article.publishedAt || '',
          category: article.category,
        }),
      });
      const json = await response.json();
      if (json?.enriched && json.overrides && onEnrichArticle) {
        onEnrichArticle(mergeDeep(article, json.overrides));
        setEnrichPhase('done');
      } else if (json?.reason === 'no_api_key') {
        setEnrichPhase('unavailable');
      } else {
        setEnrichPhase('error');
      }
    } catch {
      setEnrichPhase('error');
    }
  };

  // 浅层占位提示文案随补全状态变化
  const deepNote =
    enrichPhase === 'loading'
      ? '正在请求 AI 懒加载补全深度认知字段…（需服务端配置 Gemini 或 DeepSeek Key）'
      : enrichPhase === 'unavailable'
        ? 'AI 懒加载补全暂不可用：服务端未配置 Gemini 或 DeepSeek Key；配置后重新打开本页即可。'
      : enrichPhase === 'error'
          ? '深度分析生成失败（网络、额度或服务异常），请稍后重试。'
          : '深度分析尚未生成。只有点击“生成深度分析”后才会调用模型。';

  // Find related topic cluster if any
  const relatedTopic = TOPIC_CLUSTERS.find(t => 
    t.articleIds?.includes(article.id) || 
    t.tags.some(tag => article.tags?.includes(tag))
  );
  const latestAiMeta = Object.entries(article.aiFieldMeta || {})
    .sort((a, b) => String(b[1]?.generatedAt || '').localeCompare(String(a[1]?.generatedAt || '')))[0];
  const introText = String(article.summary || article.subtitle || '').trim();
  const hasVerdict = String(article.oneSentenceVerdict || '').trim().length > 0;
  const truthSummary = String(article.oneSentenceVerdict || article.summary || article.subtitle || '').trim();
  const backgroundSummary = article.backstoryTimeline && article.backstoryTimeline.length > 0
    ? article.backstoryTimeline[0].event
    : article.coreLogic?.essence || '该事件还未形成清晰历史背景，需继续追踪其发展脉络。';
  const counterViewSummary = article.bullBearDebate
    ? [
        article.bullBearDebate.bull?.[0]?.point,
        article.bullBearDebate.bear?.[0]?.point,
        article.bullBearDebate.coreDispute,
      ]
        .filter(Boolean)
        .join('；')
    : '暂无显著争议观点，当前更多是事实叙述或待补充分析。';
  const futureSummary = (() => {
    if (typeof article.trendForecastText === 'string' && article.trendForecastText.trim()) return article.trendForecastText.trim();
    if (article.trendForecastText && typeof article.trendForecastText === 'object') {
      const source = article.trendForecastText as Record<string, unknown>;
      const text = [source.shortTerm, source.midTerm, source.keyVariables, source.invalidation]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join('；');
      if (text) return text;
    }
    if (article.personaForecasts && article.personaForecasts.length > 0) {
      const first = article.personaForecasts[0];
      const cb = first.bull?.scenario || first.keyMonitor || '还需继续观察关键变量变化';
      return cb;
    }
    return '未来方向仍在观察中，关键变量和实现条件尚未稳定形成。';
  })();

  // 详情认知路径（去重整合版）：事实 → 对象核查 → 因果+涟漪 → 与我何干 → 预测擂台 → 深度全览
  // 注：五层光谱的 interests/logic/deduction 与下方因果/涟漪/预测同源，故此处不再单独重复；
  //     光谱层作为第 5 页的“通读排版”整合呈现。
  const tabsList: Array<{ id: CognitiveDetailTab; label: string; icon: React.ReactNode; step: string }> = [
    { id: 'seven_elements', label: '七要素事实', icon: <Sparkles className="w-4 h-4 text-[#E3120B]" />, step: '1 · 事实' },
    { id: 'entity_check', label: '对象核查', icon: <SearchCheck className="w-4 h-4 text-[#0284C7]" />, step: '2 · 核查' },
    { id: 'logic_tree', label: '因果与涟漪', icon: <GitFork className="w-4 h-4 text-purple-600" />, step: '3 · 推演' },
    { id: 'relevance_identity', label: '与我何干', icon: <UserCheck className="w-4 h-4 text-emerald-600" />, step: '4 · 身份' },
    { id: 'forecast_arena', label: '人机预测擂台', icon: <Crosshair className="w-4 h-4 text-red-600" />, step: '5 · 前瞻' },
    { id: 'deep_spectrum', label: '深度全览', icon: <Layers className="w-4 h-4 text-amber-600" />, step: '6 · 通读' },
  ];
  const tabFeatureId: Record<CognitiveDetailTab, FeatureSummaryId> = {
    seven_elements: 'detail-seven',
    entity_check: 'detail-entity-check',
    logic_tree: 'detail-logic',
    relevance_identity: 'detail-identity',
    forecast_arena: 'detail-forecast',
    deep_spectrum: 'detail-spectrum',
  };

  const handleAskProbe = async (q: string) => {
    if (!q.trim()) return;
    setProbeLoading(true);
    try {
      const res = await fetch('/api/ask-nuance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          articleContext: {
            title: article.title,
            oneSentenceVerdict: article.oneSentenceVerdict,
            sevenElements: article.sevenElements,
            logicTree: article.logicTree,
            spectrumLayers: article.spectrumLayers,
          },
        }),
      });
      const data = await res.json();
      setProbeAnswer(data.answer || '未能获取微观探针答复，请重试。');
      setProbeFallback(!!data.fallback);
    } catch (e) {
      console.error(e);
      setProbeFallback(false);
      setProbeAnswer('⚠ 未能获取答复：网络或服务异常（未生成内容），请稍后重试。');
    } finally {
      setProbeLoading(false);
    }
  };

  const handleCopyQuote = () => {
    const textToCopy = `“${article.oneSentenceVerdict || article.summary}” —— 见微 Genway ·《${article.title}》`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      <div
        className="fixed top-0 left-0 h-0.5 bg-[#E3120B] z-[60] transition-[width] duration-150"
        style={{ width: `${readingProgress}%` }}
        aria-hidden="true"
      />
      {/* Top Action Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-serif font-bold text-stone-700 hover:text-stone-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回全景情报列表</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleBookmark}
            className={`p-2 rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-100'
            }`}
            title={isBookmarked ? '取消收藏' : '收藏本篇'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>

          {onOpenShareCard && (
            <button
              onClick={() => onOpenShareCard(article)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5 transition-colors shadow-2xs"
              title="生成社交裂变金句长图（带见微认证水印）"
            >
              <FileImage className="w-3.5 h-3.5 text-amber-700" />
              <span>生成洞察金句卡</span>
            </button>
          )}

          <button
            onClick={() => setShowPrintCard(!showPrintCard)}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-medium text-stone-800 flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">生成简报卡片</span>
          </button>

          <button
            onClick={handleCopyQuote}
            className="px-3 py-2 bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
          >
            {copiedQuote ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedQuote ? '已复制金句' : '分享金句'}</span>
          </button>
        </div>
      </div>

      {/* 七要素简报卡 · 可下载（打印/另存 PDF） */}
      {showPrintCard && (
        <div className="space-y-3">
          <div
            id="briefing-sheet"
            className="bg-white border-4 border-stone-900 rounded-xl p-5 sm:p-8 font-serif shadow-2xl space-y-4"
          >
            {/* 头 */}
            <div className="brief-flex flex items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-6 h-6 rounded bg-[#E3120B] text-white text-xs font-black flex items-center justify-center shrink-0">微</span>
                <span className="text-base font-black tracking-tight text-stone-950">见微 Genway · 七要素简报卡</span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono text-stone-500">{formatArticleTime(article)}</div>
                <div className="text-[10px] font-mono text-stone-400">{article.sourceName || ''}</div>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-stone-950 leading-tight">{article.title}</h2>

            {article.sevenElements?.aiVerdict && (
              <div className="bg-stone-950 text-stone-100 rounded-xl px-4 py-3 border border-stone-800 text-xs leading-relaxed">
                <b className="text-red-500">AI 解读：</b>{article.sevenElements.aiVerdict.verdictSummary}
                <span className="ml-2 font-mono text-[10px] text-stone-400">
                  模型自评 {article.sevenElements.aiVerdict.confidenceScore}/100（未校准） · 波动 {article.sevenElements.aiVerdict.volatility} · 行动 {article.sevenElements.aiVerdict.actionLevel}
                </span>
              </div>
            )}

            {article.sevenElements ? (
              <div className="bg-stone-50 border-l-4 border-stone-900 rounded-r-xl p-3.5">
                <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider mb-1">
                  事件模型 · 一页看懂（7W 整合）
                </div>
                <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
                  {composeModel(article.sevenElements)}
                </p>
              </div>
            ) : (
              <div className="bg-stone-50 border-l-4 border-amber-500 rounded-r-xl p-3.5">
                <div className="text-[10px] font-serif font-bold text-amber-700 uppercase tracking-wider mb-1">
                  尚未深度解读
                </div>
                <p className="text-sm sm:text-base font-serif font-bold text-stone-900 leading-relaxed">
                  {article.oneSentenceVerdict || article.summary}
                </p>
                <p className="text-[10px] text-stone-400 mt-1">打开详情会自动触发 AI 深度解读；完成后此卡将填充七要素模型。</p>
              </div>
            )}

            {article.sevenElements && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 brief-grid">
                {SEVEN_W_ITEMS.map((w) => {
                  const v = (article.sevenElements as any)?.[w.key];
                  if (!v || !String(v).trim()) return null;
                  return (
                    <div key={w.key} className="flex items-start gap-2 text-xs font-sans bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                      <span className={`mt-1 w-2 h-2 rounded-full ${w.color} shrink-0`} />
                      <span>
                        <b className="text-stone-700">{w.label}：</b>
                        <span className="text-stone-800">{v}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-stone-400 border-t border-stone-200 pt-2 leading-relaxed">
              口径：七要素为事实整理，AI 解读与模型自评分均为辅助推断（非事实裁决）；本卡为速读简化版，完整分析见站内详情。生成：见微 Genway · {new Date().toLocaleDateString('zh-CN')}
            </p>
          </div>

          {/* 操作条（打印/下载时不显示） */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={() => downloadBriefingPng(article)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-serif font-bold transition-colors"
            >
              <FileImage className="w-4 h-4" />
              下载 PNG 图片
            </button>
            <button
              onClick={handlePrintBriefing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-serif font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              下载 / 打印 PDF
            </button>
            <button
              onClick={() => setShowPrintCard(false)}
              className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-serif font-bold"
            >
              ✕ 收起卡片
            </button>
            <span className="text-[10px] text-stone-400 font-sans">
              PNG 为画布直绘的简化图卡；PDF 走打印（可选“另存为 PDF”）。
            </span>
          </div>

          {/* 打印样式：只输出简报卡本身 */}
          <style>{`
            @media print {
              body.printing #root * { display: none !important; }
              body.printing #briefing-sheet,
              body.printing #briefing-sheet * { display: block !important; }
              body.printing #briefing-sheet {
                position: absolute !important;
                top: 0; left: 0; width: 100%;
                box-shadow: none !important;
                border-width: 2px !important;
              }
              body.printing #briefing-sheet .brief-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
              body.printing #briefing-sheet .brief-flex { display: flex !important; align-items: center !important; justify-content: space-between !important; }
              #briefing-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}</style>
        </div>
      )}

{/* Article Header & Meta */}
      <div className="space-y-4">
        {/* Linked Topic Cluster Banner */}
        {relatedTopic && onNavigateTab && (
          <div 
            onClick={() => onNavigateTab('topics')}
            className="p-3 bg-stone-900 text-stone-200 hover:text-white rounded-xl flex items-center justify-between cursor-pointer transition-all border border-stone-800 group shadow-xs"
          >
            <div className="flex items-center space-x-2 text-xs">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="font-serif font-bold text-amber-400">所属长周期专题：</span>
              <span className="font-serif font-bold text-white group-hover:underline">
                【{relatedTopic.title}】
              </span>
            </div>
            <span className="text-[11px] font-serif font-bold text-amber-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>查看宏观演进时间轴</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 break-words">
          <span className="font-serif font-bold text-[#E3120B] bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
            {article.category}
          </span>
          {article.isExternal && article.sourceUrl && (
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] px-2 py-0.5 rounded border border-stone-300 text-[#0284C7] hover:bg-blue-50 transition-colors"
            >
              阅读原文 ↗
            </a>
          )}
          <span className="text-stone-300">·</span>
          <span className="font-mono text-stone-700">{formatArticleTime(article)}</span>
          <span className="text-stone-300">·</span>
          <EvidenceBadge article={article} corpus={contextArticles} />
        </div>

        <h1 className="text-[26px] sm:text-4xl font-serif font-black text-stone-950 tracking-tight leading-tight break-words">
          {article.title}
        </h1>

        <p className="text-base sm:text-lg font-serif text-stone-700 leading-relaxed max-w-3xl break-words">
          {article.subtitle}
        </p>

        {/* 内容介绍：先给读者一段中性的“这篇文章大概讲了什么”，再进入 AI 解读 */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 sm:p-6 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-serif font-bold text-stone-500 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-4 h-4" />
              <span>内容介绍</span>
            </div>
            {introText.length > 180 && (
              <button
                type="button"
                onClick={() => setIntroExpanded((value) => !value)}
                className="text-[11px] font-serif font-bold text-stone-500 hover:text-stone-900 underline underline-offset-2"
              >
                {introExpanded ? '收起' : '展开'}
              </button>
            )}
          </div>
          <p className={`text-sm sm:text-base font-sans text-stone-800 leading-relaxed break-words ${
            !introExpanded ? 'line-clamp-5' : ''
          }`}>
            {introText || '本文暂未提供内容介绍。'}
          </p>
        </div>

        {/* AI 解读：内容介绍之后的一句话提炼（So What），与事实概览分离 */}
        <div className="bg-[#FAF8F5] border-l-4 border-[#E3120B] p-5 sm:p-6 rounded-r-2xl shadow-xs">
          <div className="text-xs font-serif font-bold text-[#E3120B] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4" />
            <span>
              {hasVerdict
                ? article.isExternal
                  ? 'AI 解读 · 一句话提炼 (So What)'
                  : '见微解读 · 一句话提炼 (So What)'
                : 'AI 解读 · 尚未生成'}
            </span>
          </div>
          {hasVerdict ? (
            <p className="text-base sm:text-xl font-serif font-black text-stone-950 leading-snug break-words">
              “{article.oneSentenceVerdict}”
            </p>
          ) : (
            <p className="text-sm sm:text-base font-serif text-stone-500 leading-relaxed">
              本篇尚未生成 AI 解读；上方为原始内容介绍，可在下方「七要素事实」补齐，或点击「生成深度分析」。
            </p>
          )}
        </div>

        {latestAiMeta && (
          <details className="text-[10px] text-stone-400">
            <summary className="cursor-pointer hover:text-stone-700">分析版本</summary>
            <p className="mt-1 font-mono">
              {latestAiMeta[1].method === 'legacy_unknown'
                ? '旧版 AI 字段 · 生成元数据缺失'
                : `${latestAiMeta[1].provider}/${latestAiMeta[1].model} · ${latestAiMeta[1].promptVersion} · ${
                    CERTIFICATION_STANDARDS[latestAiMeta[1].certificationStandard]?.label || '未认证'
                  }`}
            </p>
          </details>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 顶层阅读模式切换器：⚡ 30秒极简速读 vs 🔬 4步深度研判工作台 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('brief')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-serif font-bold transition-all cursor-pointer ${
              viewMode === 'brief'
                ? 'bg-white text-stone-950 shadow-xs border border-stone-300 ring-1 ring-stone-900/10'
                : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>⚡ 30秒极简速读</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('workbench')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-serif font-bold transition-all cursor-pointer ${
              viewMode === 'workbench'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/50'
            }`}
          >
            <Layers className="w-4 h-4 text-red-400" />
            <span>🔬 4步深度研判工作台</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-stone-500 pr-2 hidden sm:block">
          {viewMode === 'brief' ? '高管速览模式 · 30秒把握4大命门' : '闭环推演 · 严密事实与红蓝对撞'}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 模式 A：⚡ 30秒极简高管速读卡 (Executive Brief Card) */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === 'brief' && (
        <div className="rounded-2xl border-2 border-stone-900 bg-white p-5 sm:p-7 shadow-lg space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-base sm:text-lg font-serif font-black text-stone-950">
                今日决策战报 · 30 秒知晓全局
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
              去伪存真 · 极简提炼
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. 核心定调 (So What) */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-900">
                <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />
                <span>① 核心定调 · So What</span>
              </div>
              <p className="text-sm font-serif font-bold text-stone-950 leading-relaxed">
                “{article.oneSentenceVerdict || article.summary || article.title}”
              </p>
            </div>

            {/* 2. 正反博弈命门 (The Pivot) */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-amber-900">
                <Scale className="w-3.5 h-3.5 text-amber-700" />
                <span>② 双方争论的命门焦点 (The Pivot)</span>
              </div>
              <p className="text-sm font-serif font-bold text-stone-900 leading-relaxed">
                “{article.bullBearDebate?.coreDispute || '多空分歧集中于商业化兑现速度与供应链抗压能力。'}”
              </p>
              {article.bullBearDebate?.read && (
                <div className="text-[11px] font-mono text-amber-800">
                  天平倾斜：{article.bullBearDebate.read}
                </div>
              )}
            </div>

            {/* 3. 与我何干：专属身份行动备忘 */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-emerald-950">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>③ 与我何干 · 专属身份行动备忘</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                  当前角色：{activePersona.name}
                </span>
              </div>
              {(() => {
                const p = (article.personaImpacts || []).find((item) => item.personaId === activePersona.id);
                return (
                  <div className="space-y-1 text-xs font-serif text-stone-800">
                    <p className="font-bold text-emerald-950">
                      直击对策：{p?.recommendedAction || `针对${activePersona.name}身份保持对事件主线进展的审慎跟踪与防御性预案。`}
                    </p>
                    <p className="text-[11px] text-stone-600 font-sans">
                      关键风险：{p?.threatRisk || '行业预期修正或宏观外溢带来的波动冲击。'}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* 4. 波普尔失效红线 */}
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-red-950">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span>④ 证伪红线 · 出现什么代表判断落空</span>
              </div>
              <p className="text-xs sm:text-sm font-serif font-bold text-red-950 leading-relaxed">
                “{typeof article.trendForecastText === 'object' && article.trendForecastText !== null && 'invalidation' in article.trendForecastText
                  ? (article.trendForecastText as any).invalidation
                  : article.bullBearDebate?.bear?.[0]?.point
                    ? `核心反方论点被实证（如：${article.bullBearDebate.bear[0].point}）`
                    : '核心前置假设被后续事实推翻或主要反向指标突破预警阈值。'}”
              </p>
            </div>
          </div>

          {/* 切换至 4 步深度研判工作台 */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200">
            <span className="text-xs text-stone-500 font-serif">
              需要查看完整的定量指标、媒体立场沉默盲区或条件情景树？
            </span>
            <button
              type="button"
              onClick={() => {
                setViewMode('workbench');
                setWorkbenchStep('facts');
              }}
              className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>展开 4 步深度研判工作台</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 模式 B：🔬 4 步深度研判工作台 (4-Stage Decision Workbench) */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === 'workbench' && (
        <div className="space-y-6">
          {/* 4步决策导航栏（吸顶、清晰、杜绝混乱堆叠） */}
          <div className="sticky top-20 lg:top-14 z-30 bg-[#FAF8F5]/95 backdrop-blur-md py-2 border-b-2 border-stone-900">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'facts' as const,
                  stepNum: '第 1 步',
                  label: '事实核心与背景',
                  icon: Sparkles,
                  desc: '7要素拆解 · 前因溯源 · 利益网络',
                },
                {
                  id: 'debate' as const,
                  stepNum: '第 2 步',
                  label: '红蓝博弈与真相',
                  icon: Scale,
                  desc: '正反天平 · 定量对冲 · 沉默盲区',
                },
                {
                  id: 'identity' as const,
                  stepNum: '第 3 步',
                  label: '与我何干 (身份透镜)',
                  icon: UserCheck,
                  desc: '6类角色专属冲击 · 风险 · 备忘',
                },
                {
                  id: 'future' as const,
                  stepNum: '第 4 步',
                  label: '未来推演与证伪',
                  icon: Compass,
                  desc: '两阶段情景 · 变量雷达 · 证伪红线',
                },
              ].map((step) => {
                const isActive = workbenchStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setWorkbenchStep(step.id);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-1 ring-stone-900'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isActive ? 'bg-stone-800 text-red-400' : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {step.stepNum}
                      </span>
                      <step.icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-400' : 'text-stone-400'}`} />
                    </div>
                    <div className="font-serif font-bold text-xs sm:text-sm mt-1 truncate">
                      {step.label}
                    </div>
                    <div
                      className={`text-[10px] truncate mt-0.5 hidden sm:block ${
                        isActive ? 'text-stone-300' : 'text-stone-400'
                      }`}
                    >
                      {step.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* 第 1 步：事实核心与背景 (Facts & Context) */}
          {/* ────────────────────────────────────────────────────────── */}
          {workbenchStep === 'facts' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* 子导航：7要素大盘 / 前因溯源 / 对象核查 / 因果逻辑树 / 深度全览 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-stone-200">
                {[
                  { id: 'seven' as const, label: '7要素事实大盘 (7W)', icon: Sparkles },
                  { id: 'timeline' as const, label: '前因溯源与利益网络', icon: History },
                  { id: 'entity' as const, label: '对象实体核查', icon: SearchCheck },
                  { id: 'logic' as const, label: '因果逻辑树与涟漪', icon: GitFork },
                  { id: 'spectrum' as const, label: '五层光谱深度全览', icon: Layers },
                ].map((sub) => {
                  const isCur = factsSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setFactsSubTab(sub.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isCur
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                      }`}
                    >
                      <sub.icon className="w-3.5 h-3.5" />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 渲染子视图 */}
              <div>
                {factsSubTab === 'seven' && (
                  <SevenElementsTab
                    article={article}
                    onRunSkill={onRunSkill}
                    contextArticles={contextArticles}
                    onOpenArticle={onOpenArticle}
                  />
                )}

                {factsSubTab === 'timeline' && (
                  <DialecticalMatrixSection
                    article={article}
                    onRunSkill={onRunSkill}
                    sectionScope="background_only"
                    showHeader={false}
                  />
                )}

                {factsSubTab === 'entity' && (
                  <EntityCheckTab article={article} onRunSkill={onRunSkill} />
                )}

                {factsSubTab === 'logic' && (
                  <div className="space-y-6">
                    {article.logicTree ? (
                      <LogicTreeTab logicTree={article.logicTree} />
                    ) : (
                      <MissingDeep feature="因果逻辑树" note={deepNote} />
                    )}
                    {article.rippleEffect ? (
                      <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-serif font-bold text-[#0284C7] uppercase tracking-wider">
                          <Waves className="w-4 h-4" />
                          <span>传导与涟漪 · 承接上面的因果链看影响如何扩散</span>
                        </div>
                        <RippleEffectTab rippleEffect={article.rippleEffect} />
                      </div>
                    ) : (
                      <MissingDeep feature="涟漪效应与多源验证" note={deepNote} />
                    )}
                  </div>
                )}

                {factsSubTab === 'spectrum' &&
                  (article.spectrumLayers && article.spectrumLayers.length > 0 ? (
                    <DeepSpectrumTab article={article} />
                  ) : (
                    <MissingDeep feature="五层光谱深度全览" note={deepNote} />
                  ))}
              </div>

              {/* 步骤流转引导 */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <span className="text-xs text-stone-500 font-serif">
                  事实骨架核验完毕 ➔ 下一步：探究正反交锋的真正分歧
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWorkbenchStep('debate');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>下一步：进入第 2 步 · 红蓝博弈</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* 第 2 步：红蓝博弈与真相 (The Truth & Debate) */}
          {/* ────────────────────────────────────────────────────────── */}
          {workbenchStep === 'debate' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <DialecticalMatrixSection
                article={article}
                onRunSkill={onRunSkill}
                sectionScope="debate_only"
                showHeader={false}
              />

              {/* 步骤流转引导 */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <span className="text-xs text-stone-500 font-serif">
                  双方论据与数据核验完毕 ➔ 下一步：切换到您的角色视角看对策
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWorkbenchStep('identity');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>下一步：进入第 3 步 · 与我何干</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* 第 3 步：与我何干 (Identity & Actions) */}
          {/* ────────────────────────────────────────────────────────── */}
          {workbenchStep === 'identity' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <RelevanceIdentityTab
                article={article}
                personaImpacts={article.personaImpacts || []}
                activePersona={activePersona}
                onSelectPersona={onSelectPersona}
                onRunPersonaForecast={onRunPersonaForecast}
              />

              {/* 步骤流转引导 */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <span className="text-xs text-stone-500 font-serif">
                  角色行动备忘已明确 ➔ 下一步：设定前瞻情景树与证伪红线
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWorkbenchStep('future');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-stone-900 hover:bg-[#E3120B] text-white rounded-xl text-xs font-serif font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>下一步：进入第 4 步 · 未来推演与证伪</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* 第 4 步：未来推演与证伪 (Future & Invalidation) */}
          {/* ────────────────────────────────────────────────────────── */}
          {workbenchStep === 'future' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <TrendScenarioSection
                article={article}
                activePersona={activePersona}
                onRunSkill={onRunSkill}
                onSaveContract={onSaveContract}
              />

              {/* 预测擂台（按需折叠查看） */}
              <div className="pt-4 border-t border-stone-200">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-serif font-bold text-stone-600 hover:text-stone-950 flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-red-600" />
                      <span>查看高级预测对比：人机预测擂台</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-stone-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="pt-3">
                    <ForecastArenaTab
                      article={article}
                      onSaveContract={onSaveContract}
                      onNavigateToMyFocus={() => onNavigateTab && onNavigateTab('my_focus')}
                    />
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nuance In-depth Probe ("微观探针 / 针对本篇新闻向 AI 追问") */}
      <div className="bg-white border border-stone-300 rounded-xl overflow-hidden font-sans">
        <button
          type="button"
          onClick={() => setShowProbe((value) => !value)}
          aria-expanded={showProbe}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-stone-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-xs font-serif font-bold text-stone-800">
            <Bot className="w-4 h-4 text-[#E3120B]" />
            对本文继续追问
          </span>
          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${showProbe ? 'rotate-180' : ''}`} />
        </button>

        {showProbe && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-stone-100 space-y-4">

        <p className="text-xs text-stone-600">
          输入问题，AI 将基于本文已有内容作答。
        </p>

        {/* Preset quick probe questions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            '文中提到的良品率公差对下游交付有何实质影响？',
            '为什么各方在财报附注中披露而非在正文宣讲？',
            '未来 3 个月可能出现反转的关键指标是什么？'
          ].map((pq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setProbeQuestion(pq);
                handleAskProbe(pq);
              }}
              disabled={probeLoading}
              className="text-xs px-3 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-800 transition-colors"
            >
              ❓ {pq}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={probeQuestion}
            onChange={(e) => setProbeQuestion(e.target.value)}
            placeholder="输入您的追问..."
            className="flex-1 px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-hidden focus:border-stone-900 font-sans"
          />
          <button
            onClick={() => handleAskProbe(probeQuestion)}
            disabled={probeLoading || !probeQuestion.trim()}
            className="px-5 py-2.5 bg-stone-900 hover:bg-[#E3120B] disabled:opacity-40 text-white text-xs font-serif font-bold rounded-xl transition-all flex items-center space-x-1.5 shrink-0"
          >
            {probeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>探针追问</span>
          </button>
        </div>

        {/* Probe Answer */}
        {probeAnswer && (
          <div className="bg-white p-4 rounded-xl border border-stone-300 text-sm font-serif text-stone-800 leading-relaxed space-y-2">
            <div className="text-xs font-bold text-stone-900 font-sans flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E3120B]" />
              <span>探针解析：</span>
            </div>
            {probeFallback && (
              <p className="mb-1.5 text-[11px] font-bold text-amber-700">
                本次未生成在线内容
              </p>
            )}
            <p>{probeAnswer}</p>
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
};
