import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NewsArticle, RegionImpactInterpretation, RegionScope } from '../types';
import { detectSectors } from '../utils/sectorTaxonomy';
import { RegionSectorMatrix } from './intelligence/RegionSectorMatrix';
import { EntitySamplePanel } from './intelligence/EntitySamplePanel';
import { ThreeLevelDrill } from './intelligence/ThreeLevelDrill';
import { ComboAggregate } from './intelligence/ComboAggregate';
import { RegionDependenceWidget } from './intelligence/RegionDependenceWidget';
import { RegionImpactReadout } from './intelligence/RegionImpactReadout';
import { MapPin, X, ArrowRight, Download, Info, RefreshCw, Sparkles, Loader2, Globe2, TrendingUp, ChevronDown } from 'lucide-react';
import { buildIntelCsv, downloadCsv } from '../utils/intelExport';
import { primaryRegionMention, regionScopeOf, REGION_SCOPE_LABELS } from '../utils/regionSemantics';
import { detectMentionRegions } from '../utils/mentionRegion';
import { articleSortTime } from '../utils/articleTime';
import { FeatureSummary } from './common/FeatureSummary';
import type { FeatureSummaryId } from '../utils/featureSummaries';

type RegionSection = 'report' | 'matrix' | 'entities' | 'drill' | 'aggregate';

interface RegionIntelligencePageProps {
  articles: NewsArticle[];
  onOpenArticleById?: (articleId: string) => void;
}

const SECTOR_NAMES: Record<string, string> = {
  ai: 'AI 与软件', semi: '半导体与硬件', macro: '宏观与金融', ev: '新能源与汽车', consume: '消费电子与数码', internet: '互联网与平台', gov: '政策与治理', energy: '能源与电力', oversea: '出海与贸易',
};

/** 报告口径的涉事地区：优先 AI 标注，其次词典命中，都没有才返回空。 */
function reportRegionOf(article: NewsArticle): string | null {
  const ai = primaryRegionMention(article.regionMentions)?.region;
  if (ai) return ai;
  const mentioned = detectMentionRegions(`${article.title || ''} ${article.summary || ''}`);
  return mentioned[0] || null;
}

interface AnnotationTask {
  running: boolean;
  processed: number;
  total: number;
  failed: number;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export const RegionIntelligencePage: React.FC<RegionIntelligencePageProps> = ({
  articles,
  onOpenArticleById,
}) => {
  // 页面级筛选：时间范围 + AI 模型自评分阈值（非校准概率）
  const [range, setRange] = useState<'all' | '7d' | '30d'>('30d');
  const [confMin, setConfMin] = useState(0);
  const [regionScope, setRegionScope] = useState<RegionScope | 'all'>('all');
  const [section, setSection] = useState<RegionSection>('matrix');
  // 下钻：地区 × 赛道 组合 → 文章流
  const [drill, setDrill] = useState<{ region: string; sectorId: string } | null>(null);
  const [regionTask, setRegionTask] = useState<AnnotationTask | null>(null);
  const [entityTask, setEntityTask] = useState<AnnotationTask | null>(null);
  const [annotationStarted, setAnnotationStarted] = useState(false);
  const [annotationError, setAnnotationError] = useState('');
  const [regionReadout, setRegionReadout] = useState<RegionImpactInterpretation | null>(null);
  const [regionReadoutBusy, setRegionReadoutBusy] = useState(false);
  const [regionReadoutError, setRegionReadoutError] = useState('');
  const [reportImpact, setReportImpact] = useState<RegionImpactInterpretation | null>(null);
  const [reportImpactBusy, setReportImpactBusy] = useState(false);
  const [reportImpactError, setReportImpactError] = useState('');
  const [reportRegion, setReportRegion] = useState<string | null>(null);
  const reloadedRef = useRef(false);

  const externalCount = useMemo(() => articles.filter((a) => a.isExternal).length, [articles]);
  const regionAnnotatedCount = useMemo(
    () => articles.filter((a) => Array.isArray(a.regionMentions) && a.regionMentions.length > 0).length,
    [articles]
  );
  const entityAnnotatedCount = useMemo(
    () => articles.filter((a) => Array.isArray(a.entityMentions) && a.entityMentions.length > 0).length,
    [articles]
  );
  const scopedRegionCount = useMemo(
    () =>
      articles.filter(
        (a) =>
          Array.isArray(a.regionMentions) &&
          a.regionMentions.length > 0 &&
          a.regionMentions.every((item) => regionScopeOf(item) !== 'unspecified')
      ).length,
    [articles]
  );
  const needsAnnotation =
    externalCount > 0 &&
    (regionAnnotatedCount === 0 || scopedRegionCount < regionAnnotatedCount || entityAnnotatedCount === 0);

  const normalizeTask = (raw: any): AnnotationTask | null =>
    raw && typeof raw === 'object' && raw.task && typeof raw.task === 'object'
      ? {
          running: !!raw.task.running,
          processed: Number(raw.task.processed) || 0,
          total: Number(raw.task.total) || 0,
          failed: Number(raw.task.failed) || 0,
          status: raw.task.status || 'idle',
          startedAt: raw.task.startedAt || null,
          finishedAt: raw.task.finishedAt || null,
        }
      : null;

  const startAnnotation = async (kind: 'regions' | 'entities'): Promise<AnnotationTask | null> => {
    const res = await fetch(`/api/${kind}/annotate`, { method: 'POST' });
    const data = await res.json();
    if (!data?.ok) {
      if (data?.reason === 'no_api_key') {
        setAnnotationError('未配置 DeepSeek/Gemini Key，无法运行全量标注。可在右上角设置中配置后再试。');
      } else {
        setAnnotationError('全量标注任务启动失败，请稍后重试。');
      }
      return null;
    }
    return normalizeTask(data);
  };

  const runFullAnnotation = async () => {
    if (
      !window.confirm(
        `将对 ${externalCount} 条外部语料分批运行地区与主体 AI 标注，可能消耗在线模型额度；任务完成后页面会自动刷新。是否继续？`
      )
    ) {
      return;
    }
    setAnnotationError('');
    setAnnotationStarted(true);
    const [region, entity] = await Promise.all([
      startAnnotation('regions').catch(() => null),
      startAnnotation('entities').catch(() => null),
    ]);
    if (region) setRegionTask(region);
    if (entity) setEntityTask(entity);
  };

  useEffect(() => {
    if (!annotationStarted) return;
    const tick = async () => {
      try {
        const [r, e] = await Promise.all([
          fetch('/api/regions/status').then((x) => x.json()),
          fetch('/api/entities/status').then((x) => x.json()),
        ]);
        const region = normalizeTask(r);
        const entity = normalizeTask(e);
        if (region) setRegionTask(region);
        if (entity) setEntityTask(entity);
      } catch {
        /* 轮询失败时保持上一次状态 */
      }
    };
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [annotationStarted]);

  useEffect(() => {
    if (!annotationStarted || reloadedRef.current) return;
    if (!regionTask || !entityTask) return;
    const done =
      !regionTask.running &&
      !entityTask.running &&
      (regionTask.total + entityTask.total) > 0;
    if (!done) return;
    reloadedRef.current = true;
    const timer = setTimeout(() => window.location.reload(), 800);
    return () => clearTimeout(timer);
  }, [annotationStarted, regionTask, entityTask]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = range === 'all' ? 0 : now - (range === '7d' ? 7 : 30) * 24 * 3600 * 1000;
    return articles
      .filter((a) => {
        if (!a.regionMentions || a.regionMentions.length === 0) return false;
        const mentions =
          regionScope === 'all'
            ? a.regionMentions
            : a.regionMentions.filter((item) => regionScopeOf(item) === regionScope);
        if (mentions.length === 0) return false;
        if (confMin > 0 && !mentions.some((r) => r.confidence >= confMin)) return false;
        if (range !== 'all') {
          const t = a.publishedAt ? new Date(a.publishedAt).getTime() : NaN;
          if (Number.isNaN(t) || t < cutoff) return false;
        }
        return true;
      })
      .map((article) => {
        if (regionScope === 'all') return article;
        return {
          ...article,
          regionMentions: (article.regionMentions || []).filter(
            (item) => regionScopeOf(item) === regionScope
          ),
        };
      });
  }, [articles, range, confMin, regionScope]);

  // 报告口径的地区热度分布：优先 AI 标注，其次词典命中，取近 30 天有发布时间的条目。
  const regionDistribution = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const map = new Map<string, { count: number; list: NewsArticle[]; sectors: Map<string, number> }>();
    for (const a of articles) {
      const region = reportRegionOf(a);
      if (!region) continue;
      const t = articleSortTime(a);
      if (t > 0 && t < cutoff) continue;
      const entry = map.get(region) || { count: 0, list: [], sectors: new Map<string, number>() };
      entry.count += 1;
      entry.list.push(a);
      for (const s of detectSectors(a)) entry.sectors.set(s, (entry.sectors.get(s) || 0) + 1);
      map.set(region, entry);
    }
    return [...map.entries()]
      .map(([region, e]) => ({
        region,
        count: e.count,
        list: [...e.list].sort((x, y) => articleSortTime(y) - articleSortTime(x)),
        sectors: [...e.sectors.entries()].sort((x, y) => y[1] - x[1]).map(([id]) => id),
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-serif font-bold border transition-colors ${
      active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-300'
    }`;

  const requestRegionImpact = async (region: string, sectorLabel: string, matched: NewsArticle[]) => {
    const response = await fetch('/api/region/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        region,
        sector: sectorLabel,
        articles: matched.slice(0, 12).map((article) => ({
          title: article.title,
          source: article.sourceName,
          publishedAt: article.publishedAt || article.sourceDate || article.date,
          summary: article.summary,
        })),
      }),
    });
    const data = await response.json();
    if (data?.ok && data.data) return { ok: true as const, data: data.data as RegionImpactInterpretation };
    return { ok: false as const, reason: String(data?.reason || 'error') };
  };

  const runRegionInterpret = async (region: string, sectorId: string, matched: NewsArticle[]) => {
    if (matched.length === 0 || regionReadoutBusy) return;
    setRegionReadoutBusy(true);
    setRegionReadoutError('');
    setRegionReadout(null);
    try {
      const result = await requestRegionImpact(region, SECTOR_NAMES[sectorId] || sectorId, matched);
      if (result.ok) setRegionReadout(result.data);
      else setRegionReadoutError(result.reason === 'no_api_key' ? '未配置在线 AI Key，无法生成地区影响推演。' : '地区影响推演生成失败。');
    } catch {
      setRegionReadoutError('地区影响推演请求失败。');
    } finally {
      setRegionReadoutBusy(false);
    }
  };

  const runReportImpact = async () => {
    const top = regionDistribution[0];
    if (!top || reportImpactBusy) return;
    setReportImpactBusy(true);
    setReportImpactError('');
    setReportImpact(null);
    setReportRegion(top.region);
    try {
      const result = await requestRegionImpact(top.region, SECTOR_NAMES[top.sectors[0]] || '综合', top.list);
      if (result.ok) setReportImpact(result.data);
      else setReportImpactError(result.reason === 'no_api_key' ? '未配置在线 AI Key，无法生成地区影响推演。' : '地区影响推演生成失败。');
    } catch {
      setReportImpactError('地区影响推演请求失败。');
    } finally {
      setReportImpactBusy(false);
    }
  };

  const annotationRows: Array<{ label: string; task: AnnotationTask }> = [];
  if (regionTask) annotationRows.push({ label: '地区标注', task: regionTask });
  if (entityTask) annotationRows.push({ label: '主体标注', task: entityTask });

  const sections: Array<{ id: RegionSection; label: string }> = [
    { id: 'matrix', label: '地区矩阵' },
    { id: 'entities', label: '主体抽样' },
    { id: 'drill', label: '三级下钻' },
    { id: 'aggregate', label: '组合聚合' },
  ];
  const sectionFeatureId: Record<RegionSection, FeatureSummaryId> = {
    report: 'region-report',
    matrix: 'region-matrix',
    entities: 'region-entities',
    drill: 'region-drill',
    aggregate: 'region-aggregate',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 shadow-md">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-[#0284C7]" />
          <span className="text-xs font-mono font-bold text-[#38BDF8] uppercase tracking-wider">
            地区情报页
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white mt-2">
          升温发生在哪里，会往哪传导
        </h1>
        <p className="text-xs sm:text-sm text-stone-300 font-sans max-w-3xl mt-1">
          先给结论：今天哪些地区最热、为什么集中在这里发生、单点依赖是否失衡；需要时再展开矩阵与下钻工具。
        </p>

        {needsAnnotation && (
          <div className="mt-4 rounded-xl border border-sky-500/40 bg-sky-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] leading-relaxed text-sky-100 max-w-2xl">
              当前语料有 {externalCount} 条外部信源，地区标注已缓存 {regionAnnotatedCount} 条（其中已完成范围区分 {scopedRegionCount} 条）、
              主体标注已缓存 {entityAnnotatedCount} 条。下方矩阵/下钻需要先写入全量 AI 标注数据，
              任务会分小批运行并写回语料，完成后本页自动刷新。
            </div>
            <button
              onClick={() => void runFullAnnotation()}
              disabled={annotationStarted}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-sky-950 text-xs font-serif font-bold hover:bg-sky-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${annotationStarted ? 'animate-spin' : ''}`} />
              {annotationStarted ? '标注任务已启动' : '启动全量标注（地区+主体）'}
            </button>
          </div>
        )}

        {annotationError && (
          <div className="mt-3 rounded-xl border border-red-400/50 bg-red-950/30 px-4 py-2.5 text-[11px] text-red-100">
            {annotationError}
          </div>
        )}

        {annotationStarted && (regionTask || entityTask) && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {annotationRows.map(({ label, task: t }) => {
                const progress = t.total > 0 ? Math.min(100, Math.round((t.processed / t.total) * 100)) : 0;
                return (
                  <div key={label} className="bg-white/10 border border-white/15 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] text-sky-100">
                      <span className="font-serif font-bold">{label}</span>
                      <span className="font-mono">
                        {t.processed}/{t.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
            })}
          </div>
        )}

      </div>

      {/* ===== 态势报告（默认读一遍） ===== */}
      <FeatureSummary featureId="region-report" compact />

      {/* 板块 A：今天哪些地区热 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-[#E3120B]" />
          <h2 className="text-sm font-serif font-black text-stone-900">今天哪些地区热</h2>
          <span className="text-[10px] text-stone-400 font-mono">按涉事地区条数排序 · 近 30 天</span>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          {regionDistribution.length === 0 ? (
            <div className="py-10 text-center text-xs text-stone-400">
              暂无地区标注或词典命中，先运行上方“全量标注”再回来查看。
            </div>
          ) : (
            <div className="space-y-2.5">
              {(() => {
                const maxCount = Math.max(...regionDistribution.map((r) => r.count), 1);
                return regionDistribution.slice(0, 8).map((row, index) => (
                  <div key={row.region} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-stone-900 text-white flex items-center justify-center font-mono font-bold text-[11px]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif font-black text-stone-900">{row.region}</span>
                        <span className="font-mono text-[11px] text-stone-500 shrink-0">{row.count} 条</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E3120B] rounded-full" style={{ width: `${(row.count / maxCount) * 100}%` }} />
                      </div>
                      {row.sectors.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.sectors.slice(0, 3).map((sid) => (
                            <span key={sid} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600">
                              {SECTOR_NAMES[sid] || sid}
                            </span>
                          ))}
                        </div>
                      )}
                      {row.list[0] && (
                        <button
                          type="button"
                          onClick={() => onOpenArticleById?.(row.list[0].id)}
                          className="mt-2 w-full text-left text-[11px] leading-relaxed text-stone-700 line-clamp-2 hover:text-[#E3120B]"
                        >
                          {row.list[0].title}
                        </button>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </section>

      {/* 板块 B：为什么集中在这里发生 + 怎么传导 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-serif font-black text-stone-900">为什么集中在这里发生，会往哪传导</h2>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          {regionDistribution.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">暂无地区可推演。</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5">
                <div className="text-[11px] text-sky-950 leading-relaxed max-w-2xl">
                  <b className="font-serif">地区影响解读：</b>
                  针对当前最热的「{regionDistribution[0].region}」（{SECTOR_NAMES[regionDistribution[0].sectors[0]] || '综合'}），解释为什么是这里、可能向哪些地区或行业传导。
                </div>
                <button
                  type="button"
                  onClick={() => void runReportImpact()}
                  disabled={reportImpactBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-teal-700 disabled:opacity-40 text-white text-[11px] font-serif font-bold"
                >
                  {reportImpactBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {reportImpactBusy ? '正在推演…' : reportImpact ? '重新生成' : '生成影响解读'}
                </button>
              </div>

              {reportImpactError && <p className="text-[11px] text-red-700">{reportImpactError}</p>}

              {reportImpact && (
                <RegionImpactReadout
                  readout={reportImpact}
                  entities={Array.from(new Set(regionDistribution[0].list.flatMap((a) => (a.entityMentions || []).map((m) => m.name)))).slice(0, 60)}
                />
              )}
            </div>
          )}
        </div>

        <RegionDependenceWidget articles={articles} onOpenArticleById={onOpenArticleById} />
      </section>

      {/* ===== 深挖工具抽屉 ===== */}
      <details className="group bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-stone-50">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-serif font-bold text-stone-800">深挖工具</span>
            <span className="text-[10px] text-stone-400">地区矩阵 · 主体抽样 · 三级下钻 · 组合聚合</span>
          </div>
          <ChevronDown className="w-4 h-4 text-stone-400 group-open:rotate-180 transition-transform" />
        </summary>

        <div className="border-t border-stone-200 px-4 sm:px-5 py-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-stone-400 font-mono">时间：</span>
              {(
                [
                  { id: 'all', label: '全部', title: '含历史旧闻（发布日期超过 30 天的条目仍计入）' },
                  { id: '7d', label: '近 7 天', title: '仅发布日期在近 7 天内的条目' },
                  { id: '30d', label: '近 30 天', title: '仅发布日期在近 30 天内的条目' },
                ] as const
              ).map((o) => (
                <button key={o.id} onClick={() => setRange(o.id)} className={chip(range === o.id)} title={o.title}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-stone-400 font-mono">模型自评分：</span>
              {[0, 0.5, 0.7].map((v) => (
                <button key={v} onClick={() => setConfMin(v)} className={chip(confMin === v)}>
                  {v === 0 ? '不限' : `≥${v}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-stone-400 font-mono">地区范围：</span>
              <button onClick={() => setRegionScope('all')} className={chip(regionScope === 'all')}>
                全部
              </button>
              {(Object.keys(REGION_SCOPE_LABELS) as RegionScope[]).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setRegionScope(scope)}
                  className={chip(regionScope === scope)}
                  title={scope === 'unspecified' ? '旧数据或模型无法判断范围' : REGION_SCOPE_LABELS[scope]}
                >
                  {REGION_SCOPE_LABELS[scope]}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-stone-400 font-mono ml-auto">命中 {filtered.length} 条</span>
            <button
              onClick={() => downloadCsv('jianwei-intel.csv', buildIntelCsv(filtered))}
              disabled={filtered.length === 0}
              className="px-3 py-1.5 bg-[#0D9488] hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg text-xs font-serif font-bold flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出筛选 CSV</span>
            </button>
          </div>

          <details className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-[11px] text-sky-900">
            <summary className="cursor-pointer flex items-center gap-1.5 font-serif font-bold">
              <Info className="w-3.5 h-3.5" />
              页面口径
            </summary>
            <p className="mt-1.5">地区优先按事件发生地展示，其次实际受影响地；旧数据保持范围未标，不自动推断。</p>
          </details>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-stone-200 pb-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-serif font-bold whitespace-nowrap transition-colors ${
              section === item.id
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <FeatureSummary featureId={sectionFeatureId[section]} compact />

      {section === 'matrix' && (
      <>
      <RegionSectorMatrix
        articles={filtered}
        onCell={(region, sectorId) => {
          setDrill({ region, sectorId });
          setRegionReadout(null);
          setRegionReadoutError('');
        }}
      />

      {drill ? (
        (() => {
          const sectorName = SECTOR_NAMES[drill.sectorId] || drill.sectorId;
          const matched = filtered.filter((a) => {
            return primaryRegionMention(a.regionMentions)?.region === drill.region && detectSectors(a).includes(drill.sectorId);
          });
          return (
            <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="text-sm font-serif font-bold text-stone-950 flex items-center space-x-2">
                  <span>下钻：{drill.region} × {sectorName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                    {matched.length} 条
                  </span>
                </h3>
                <button
                  onClick={() => setDrill(null)}
                  className="p-1.5 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100"
                  aria-label="关闭下钻"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-3">
                <FeatureSummary featureId="region-impact" compact />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-sky-950 leading-relaxed">
                    <b className="font-serif">地区影响解读：</b>
                    解释为什么是这里、可能向哪些地区或行业传导，以及接下来应观察什么。
                  </div>
                  <button
                    type="button"
                    onClick={() => void runRegionInterpret(drill.region, drill.sectorId, matched)}
                    disabled={regionReadoutBusy || matched.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-teal-700 disabled:opacity-40 text-white text-[11px] font-serif font-bold"
                  >
                    {regionReadoutBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {regionReadoutBusy ? '正在推演…' : regionReadout ? '重新生成' : '生成影响解读'}
                  </button>
                </div>

                {regionReadoutError && (
                  <p className="text-[11px] text-red-700">{regionReadoutError}</p>
                )}

                {regionReadout && (
                  <RegionImpactReadout
                    readout={regionReadout}
                    entities={Array.from(new Set(matched.flatMap((article) => (article.entityMentions || []).map((item) => item.name)))).slice(0, 60)}
                  />
                )}
              </div>

              {matched.length > 0 ? (
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {matched.slice(-12).reverse().map((a) => (
                    <button
                      key={a.id}
                      onClick={() => onOpenArticleById && onOpenArticleById(a.id)}
                      className="w-full text-left p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-800 flex items-center justify-between gap-2"
                    >
                      <span className="line-clamp-1">
                        {a.title}
                        <span className="text-stone-400 font-mono ml-2">({a.sourceName || '?'})</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-stone-400 text-xs">该组合在当前筛选下无匹配条目。</div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="py-2 text-center text-[11px] text-stone-400">
          提示：点击上方矩阵中有数值的格子，可下钻查看该“地区 × 赛道”组合的文章流。
        </div>
      )}
      </>
      )}

      {section === 'entities' && (
        <EntitySamplePanel articles={filtered} onOpenArticleById={onOpenArticleById} />
      )}
      {section === 'drill' && (
        <ThreeLevelDrill articles={filtered} onOpenArticleById={onOpenArticleById} />
      )}
      {section === 'aggregate' && <ComboAggregate articles={filtered} />}
        </div>
      </details>
    </div>
  );
};
