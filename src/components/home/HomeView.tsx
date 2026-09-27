import React, { lazy, Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { 
  NewsArticle, 
  HomeReadingMode, 
  UserPersona, 
  RadarKeyword,
  MorningBriefing,
} from '../../types';
import { DailyFocusPulse } from './DailyFocusPulse';
import { HomeHeroStatus } from './HomeHeroStatus';
import { MorningBriefingHero } from './MorningBriefingHero';
import { StandardModeFeed } from './StandardModeFeed';
import { EventTrackingPanel } from './EventTrackingPanel';
import { UserCheck, ShieldCheck, Bookmark, Radio, Target, Globe, Layers, FileText, Headphones } from 'lucide-react';
import { corpusDerived, deriveFromList } from '../../utils/corpusMetrics';
import { articleSortTime, parseArticleDate } from '../../utils/articleTime';
import { detectBreaking, topHotWords, type HotWord } from '../../utils/todayBrief';
import { NEWS_INTEREST_GROUPS, keywordMatches, matchesNewsInterestGroups } from '../../utils/sectorTaxonomy';
import { monitorHits } from '../../utils/monitorKeywords';
import { buildEvidenceProfile } from '../../utils/evidenceProfile';
import { importanceMeta, authorityMeta, type RankedArticleMeta, type AuthorityMeta } from '../../utils/importanceRank';
import { relevanceMeta, type RelevanceMeta } from '../../utils/relevanceRank';
import { buildEventClusters } from '../../utils/eventClusters';
import { FeatureSummary } from '../common/FeatureSummary';

const TongsuModeFeed = lazy(() =>
  import('./TongsuModeFeed').then((module) => ({ default: module.TongsuModeFeed }))
);
const DehydratedModeFeed = lazy(() =>
  import('./DehydratedModeFeed').then((module) => ({ default: module.DehydratedModeFeed }))
);

export type NewsSkill =
  | 'plain'
  | 'dehydrate'
  | 'interpret'
  | 'sevenw'
  | 'verdict'
  | 'trend'
  | 'risk'
  | 'timeline'
  | 'stakeholders'
  | 'corelogic'
  | 'debate'
  | 'relatednews'
  | 'entitycheck';

interface HomeViewProps {
  articles: NewsArticle[];
  /** 满足展示时间的当日晨报；仅由 App 在首次打开时传入。 */
  briefing?: MorningBriefing | null;
  onAcknowledgeBriefing?: () => void;
  readingMode: HomeReadingMode;
  onSelectReadingMode: (mode: HomeReadingMode) => void;
  selectedPersona: UserPersona;
  radarKeywords: RadarKeyword[];
  bookmarkedIds: string[];
  followedTags: string[];
  /** 用户设置中的兴趣领域；非空时首页默认进入「我的领域」。 */
  interestGroups: string[];
  onSelectArticle: (article: NewsArticle) => void;
  onToggleBookmark: (articleId: string) => void;
  onToggleFollowTag: (tag: string) => void;
  /** 技能型单项生成：sevenw=7W事件模型 / trend=趋势情景 / risk=风险审稿；成功返回更新后文章，失败返回 null */
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
  onRemoveRadar?: (id: string) => void;
  onOpenAudioBriefing: () => void;
  onOpenAddRadar: () => void;
  onOpenTermExplain: (term: string) => void;
  onOpenSettings?: () => void;
  onOpenShareCard?: (article: NewsArticle) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  articles,
  briefing,
  onAcknowledgeBriefing,
  readingMode,
  onSelectReadingMode,
  selectedPersona,
  radarKeywords,
  bookmarkedIds,
  followedTags,
  interestGroups,
  onSelectArticle,
  onToggleBookmark,
  onToggleFollowTag,
  onRunSkill,
  onRemoveRadar,
  onOpenAudioBriefing,
  onOpenAddRadar,
  onOpenTermExplain,
  onOpenSettings,
  onOpenShareCard,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    interestGroups.length > 0 ? '我的领域' : '全部'
  );
  const [selectedRadarFilter, setSelectedRadarFilter] = useState<string | null>(null);
  // 注：每条当日新闻都可深度解读（点开详情即由 /api/enrich 生成），故不再提供
  // “深度解读/外部信源”筛选口径——解析状态用卡片徽标体现（见 StandardModeFeed）。
  // 分页：默认先展示按“今日重要度”排序的前 10 条，底部继续加载
  const [visibleCount, setVisibleCount] = useState(10);
  const PAGE_SIZE = 10;
  const [rankingMode, setRankingMode] = useState<'global' | 'relevant' | 'authority'>('global');
  const [feedGranularity, setFeedGranularity] = useState<'events' | 'articles'>('events');
  const interestSignature = interestGroups.join('|');

  useEffect(() => {
    setSelectedCategory((current) => {
      if (interestGroups.length > 0) {
        return current === '全部' || current === '外部信源' ? '我的领域' : current;
      }
      return current === '我的领域' ? '全部' : current;
    });
  }, [interestSignature]);

  // —— 今日简报数据：今日(本地日期)真实发布条目 → 情绪/突发（见 utils/todayBrief.ts）——
  const { todayList, dToday, d30, scope, breaking, dayStartTs } = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const list = articles.filter((a) => {
      if (!a.isExternal || !a.publishedAt) return false;
      const ts = parseArticleDate(a.publishedAt);
      return ts !== null && ts >= dayStart;
    });
    const today = deriveFromList(list);
    const useToday = today.scanned >= 20;
    const fallback = useToday ? today : corpusDerived(articles, 30);
    return {
      todayList: list,
      dToday: today,
      d30: fallback,
      scope: (useToday ? 'today' : '30d') as 'today' | '30d',
      breaking: detectBreaking(list),
      dayStartTs: dayStart,
    };
  }, [articles]);

  const interestNames = useMemo(
    () => NEWS_INTEREST_GROUPS.filter((group) => interestGroups.includes(group.id)).map((group) => group.name),
    [interestSignature]
  );

  const categories = useMemo(() => {
    const topic = [
      ...(interestGroups.length > 0 ? ['我的领域'] : []),
      '全部',
      '关注',
      '影响我',
      'AI 前沿',
      '科技前沿',
      '全球财经',
      '产业纵深',
    ];
    // 有监控词时，在“关注/影响我”附近插入「监控中」筛选
    if (radarKeywords.length > 0) {
      const idx = topic.indexOf('影响我');
      if (idx >= 0) topic.splice(idx, 0, '监控中');
    }
    return {
      topic,
      evidence: ['多源印证'],
      source: ['科技', '财经', '其他'],
    };
  }, [interestSignature, radarKeywords]);

  // —— 当日信息流池：首页只展示“今日（本地日期）真实发布”的外部新闻；
  //     站内/投递文章若其发布日期是今天也计入。历史旧文不再混入首页信息流。
  const todayFeed = useMemo(() => {
    const nextDay = dayStartTs + 24 * 3600 * 1000;
    return articles.filter((a) => {
      // 1) 有真实发布时间的外部条目：按今日判定
      if (a.publishedAt) {
        const ts = parseArticleDate(a.publishedAt);
        if (ts !== null) return ts >= dayStartTs && ts < nextDay;
      }
      // 2) 无 publishedAt 的站内/投递文章：按 sourceDate/date（如用户今天 AI 投递）
      const st = parseArticleDate(a.sourceDate) ?? parseArticleDate(a.date);
      return st !== null && st >= dayStartTs && st < nextDay;
    });
  }, [articles, dayStartTs]);

  // 近 3 日信息流池 (72 小时范围)
  const threeDayFeed = useMemo(() => {
    const threeDaysAgo = dayStartTs - 2 * 24 * 3600 * 1000;
    const nextDay = dayStartTs + 24 * 3600 * 1000;
    return articles.filter((a) => {
      const ts =
        parseArticleDate(a.publishedAt || '') ??
        parseArticleDate(a.sourceDate || '') ??
        parseArticleDate(a.date || '') ??
        0;
      return ts >= threeDaysAgo && ts < nextDay;
    });
  }, [articles, dayStartTs]);

  // 信息流时间窗口：今日 / 全部；“近几日”由独立的“事件追踪”板块承接。
  const [timeHorizon, setTimeHorizon] = useState<'today' | 'all'>('today');
  const [priorityMode, setPriorityMode] = useState<'priority' | 'trust' | 'evidence'>('priority');
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'professional'>('simple');

  // 当日静默检测：今日确实无任何新情报
  const isQuietDay = todayFeed.length === 0;

  // 基础底池：按时间窗口选取；若今日无条目，智能切换近 3 日或全部，避免空白
  const basePool = useMemo(() => {
    if (timeHorizon === 'today') {
      if (isQuietDay) {
        return threeDayFeed.length > 0 ? threeDayFeed : articles;
      }
      return todayFeed;
    }
    return articles;
  }, [timeHorizon, isQuietDay, todayFeed, threeDayFeed, articles]);

  // 当前底池命中监控词的条数（分类 pill 徽章）
  const monitorTodayCount = useMemo(
    () => basePool.filter((a) => monitorHits(a, radarKeywords).length > 0).length,
    [basePool, radarKeywords]
  );

  // 当前底池每条新闻的“重要度”与入选理由；只计算一次，供排序与卡片展示共用。
  const importanceById = useMemo(() => {
    const map = new Map<string, RankedArticleMeta>();
    for (const article of basePool) map.set(article.id, (article.importance as RankedArticleMeta | undefined) ?? importanceMeta(article));
    return map;
  }, [basePool]);

  // 当前底池每条新闻的“对我相关度”；只计算一次，供排序与卡片展示共用。
  const relevanceById = useMemo(() => {
    const map = new Map<string, RelevanceMeta>();
    for (const article of basePool) {
      map.set(
        article.id,
        relevanceMeta(article, {
          persona: selectedPersona,
          interestGroups,
          radarKeywords,
          followedTags,
          bookmarkedIds,
        })
      );
    }
    return map;
  }, [basePool, selectedPersona, interestSignature, radarKeywords, followedTags, bookmarkedIds]);

  // 当前底池每条新闻的“权威度”：来源等级 50% + 多源印证 35% + 可追溯证据 15%。
  const authorityById = useMemo(() => {
    const map = new Map<string, AuthorityMeta>();
    for (const article of basePool) map.set(article.id, authorityMeta(article));
    return map;
  }, [basePool]);

  // 首页热词：今日样本太少时，退回到当前展示窗口（近 3 日/全部）统计，避免热词行空白。
  const hotWords: HotWord[] = useMemo(
    () => topHotWords(todayList.length >= 5 ? todayList : basePool, 8),
    [todayList, basePool]
  );

  // Filtered list（按底池 → 分类/热词筛选 → 按重要度降序，同分再按时间倒序）
  const filteredArticles = useMemo(() => {
    return basePool
      .filter((article) => {
        // If a radar keyword is clicked in widget
        if (selectedRadarFilter) {
          const q = selectedRadarFilter.toLowerCase();
          const matchesRadar =
            article.title.toLowerCase().includes(q) ||
            article.tags.some((t) => t.toLowerCase().includes(q)) ||
            article.summary.toLowerCase().includes(q);
          if (!matchesRadar) return false;
        }

        if (selectedCategory === '监控中') {
          // 只看命中“我的监控词”的新闻
          return monitorHits(article, radarKeywords).length > 0;
        }
        if (selectedCategory === '我的领域') {
          return matchesNewsInterestGroups(article, interestGroups);
        }
        if (selectedCategory === '全部') return true;
        if (selectedCategory === '科技') return article.sourceCategory === 'tech';
        if (selectedCategory === '财经') return article.sourceCategory === 'finance';
        if (selectedCategory === '其他') return article.sourceCategory === 'other';
        if (selectedCategory === '多源印证') {
          return buildEvidenceProfile(article, articles).status === 'corroborated';
        }
        if (selectedCategory === '关注') {
          if (bookmarkedIds.includes(article.id)) return true;
          const fields = [article.category, ...(article.tags || [])]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase());
          return followedTags.some((tag) => {
            const normalized = tag.trim().toLowerCase();
            if (!normalized) return false;
            return fields.some((field) => field === normalized || field.includes(normalized) || normalized.includes(field));
          });
        }
        if (selectedCategory === '影响我') {
          return article.personaImpacts?.some((p) => p.personaId === selectedPersona.id);
        }

        // 基础精确标签/分类匹配
        if (article.category === selectedCategory || article.tags.includes(selectedCategory)) {
          return true;
        }

        // 语义赛道扩展匹配：让「AI 前沿」「科技前沿」「全球财经」「产业纵深」能够命中对应的赛道关键词与文本
        const text = `${article.title || ''} ${article.summary || ''} ${(article.tags || []).join(' ')}`.toLowerCase();
        if (selectedCategory === 'AI 前沿') {
          return (
            article.category?.toLowerCase().includes('ai') ||
            keywordMatches(text, 'AI') ||
            keywordMatches(text, '大模型') ||
            keywordMatches(text, '人工智能') ||
            keywordMatches(text, 'Agent') ||
            keywordMatches(text, 'OpenAI') ||
            keywordMatches(text, '算力')
          );
        }
        if (selectedCategory === '科技前沿') {
          return (
            article.category?.toLowerCase().includes('科技') ||
            article.category?.toLowerCase().includes('tech') ||
            keywordMatches(text, '芯片') ||
            keywordMatches(text, '半导体') ||
            keywordMatches(text, '硬件') ||
            keywordMatches(text, '科技') ||
            keywordMatches(text, '智能')
          );
        }
        if (selectedCategory === '全球财经') {
          return (
            article.category?.toLowerCase().includes('财经') ||
            article.category?.toLowerCase().includes('宏观') ||
            keywordMatches(text, '美联储') ||
            keywordMatches(text, '央行') ||
            keywordMatches(text, '利率') ||
            keywordMatches(text, '降息') ||
            keywordMatches(text, '通胀') ||
            keywordMatches(text, '关税') ||
            keywordMatches(text, '股市') ||
            keywordMatches(text, '汇率')
          );
        }
        if (selectedCategory === '产业纵深') {
          return (
            article.category?.toLowerCase().includes('产业') ||
            keywordMatches(text, '汽车') ||
            keywordMatches(text, '新能源') ||
            keywordMatches(text, '出海') ||
            keywordMatches(text, '供应链') ||
            keywordMatches(text, '电池') ||
            keywordMatches(text, '制造')
          );
        }

        return false;
      })
      .slice()
      .sort((a, b) => {
        const priorityDiff =
          (relevanceById.get(b.id)?.score ?? 0) * 2 +
          (importanceById.get(b.id)?.score ?? 0) -
          ((relevanceById.get(a.id)?.score ?? 0) * 2 + (importanceById.get(a.id)?.score ?? 0));
        const trustDiff =
          (authorityById.get(b.id)?.score ?? 0) * 2 +
          (importanceById.get(b.id)?.score ?? 0) -
          ((authorityById.get(a.id)?.score ?? 0) * 2 + (importanceById.get(a.id)?.score ?? 0));
        const evidenceDiff =
          ((a.evidenceChain?.length ?? 0) * 10 + (a.sourceOccurrences?.length ?? 0) * 4 + (a.sourceCount ?? 0) * 2) -
          ((b.evidenceChain?.length ?? 0) * 10 + (b.sourceOccurrences?.length ?? 0) * 4 + (b.sourceCount ?? 0) * 2);

        if (priorityMode === 'trust') {
          if (trustDiff !== 0) return trustDiff;
        } else if (priorityMode === 'evidence') {
          if (evidenceDiff !== 0) return -evidenceDiff;
        } else if (priorityMode === 'priority') {
          if (priorityDiff !== 0) return priorityDiff;
        }

        if (rankingMode === 'authority') {
          const authorityDiff =
            (authorityById.get(b.id)?.score ?? 0) -
            (authorityById.get(a.id)?.score ?? 0);
          if (authorityDiff !== 0) return authorityDiff;
        }
        if (rankingMode === 'relevant') {
          const relDiff =
            (relevanceById.get(b.id)?.score ?? 0) -
            (relevanceById.get(a.id)?.score ?? 0);
          if (relDiff !== 0) return relDiff;
        }
        const scoreDiff =
          (importanceById.get(b.id)?.score ?? 0) -
          (importanceById.get(a.id)?.score ?? 0);
        return scoreDiff || articleSortTime(b) - articleSortTime(a);
      });
  }, [basePool, articles, selectedCategory, selectedRadarFilter, followedTags, bookmarkedIds, selectedPersona, radarKeywords, interestGroups, importanceById, relevanceById, authorityById, rankingMode, priorityMode]);

  // 分类/关键词/时间跨度变化时，分页回到第一页
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, selectedRadarFilter, radarKeywords, timeHorizon]);

  // 事件视图：把筛选后的单篇报道合并成事件节点；合并后仍按当前排序视角重排，避免权威/相关度被事件合并冲掉。
  const eventFeed = useMemo(
    () => {
      const leads = buildEventClusters(filteredArticles).map((cluster) => cluster.lead);
      if (rankingMode === 'authority') {
        return leads.sort(
          (a, b) => (authorityById.get(b.id)?.score ?? 0) - (authorityById.get(a.id)?.score ?? 0)
        );
      }
      if (rankingMode === 'relevant') {
        return leads.sort(
          (a, b) => (relevanceById.get(b.id)?.score ?? 0) - (relevanceById.get(a.id)?.score ?? 0)
        );
      }
      return leads;
    },
    [filteredArticles, rankingMode, authorityById, relevanceById]
  );

  // 分页后的列表（事件/单篇共用，底部“再看 20 条”）
  const displayFeed = useMemo(() => {
    const source = feedGranularity === 'events' ? eventFeed : filteredArticles;
    return source.slice(0, visibleCount);
  }, [feedGranularity, eventFeed, filteredArticles, visibleCount]);

  const signalSummary = useMemo(() => {
    const mostRelevant = filteredArticles[0];
    const highRisk = filteredArticles.filter((article) => (article.bullBearDebate?.bear?.length ?? 0) > 0 || (article.riskReviewText ? 1 : 0) > 0).slice(0, 3);
    const futureWatch = filteredArticles.filter((article) => !!article.trendForecastText || (article.personaForecasts?.length ?? 0) > 0 || !!article.riskReviewText).slice(0, 3);
    const priorityCount = filteredArticles.length;
    const credibilityReady = filteredArticles.filter((article) => (article.evidenceChain?.length ?? 0) > 0).length;
    const recommendedAction = mostRelevant?.personaImpacts?.find((item) => item.personaId === selectedPersona.id)?.recommendedAction
      || mostRelevant?.stakeholderImpact?.[0]?.why
      || '先核对事实来源和时间，再决定是否行动。';

    return {
      mostRelevant,
      highRisk,
      futureWatch,
      priorityCount,
      credibilityReady,
      recommendedAction,
    };
  }, [filteredArticles, selectedPersona]);

  const heroStats = useMemo(() => ({
    total: articles.length,
    todayCount: todayList.length,
    scanned: (scope === 'today' ? dToday : d30).scanned,
    positive: (scope === 'today' ? dToday : d30).positive,
    negative: (scope === 'today' ? dToday : d30).negative,
    neutral: (scope === 'today' ? dToday : d30).neutral,
    mixed: (scope === 'today' ? dToday : d30).mixed,
    net: (scope === 'today' ? dToday : d30).net,
    ratio: (scope === 'today' ? dToday : d30).optimismRatio,
    hasLive: articles.length > 0,
    scope,
  }), [articles.length, todayList.length, scope, dToday, d30]);

  const topPriorityArticle = useMemo(() => filteredArticles[0], [filteredArticles]);
  const evidenceLead = useMemo(
    () => filteredArticles.find((article) => (article.evidenceChain?.length ?? 0) > 0),
    [filteredArticles]
  );
  const riskLead = useMemo(
    () => filteredArticles.find((article) => (article.bullBearDebate?.bear?.length ?? 0) > 0 || !!article.riskReviewText),
    [filteredArticles]
  );

  const handleOpenBreaking = useCallback((art: NewsArticle) => {
    const matched = articles.find((a) => a.id === art.id);
    if (matched) onSelectArticle(matched);
    else onSelectArticle(art);
  }, [articles, onSelectArticle]);

  const handleHotWordSelect = useCallback((word: string) => {
    setSelectedCategory('全部');
    setSelectedRadarFilter(word);
    setTimeHorizon('today');
    setVisibleCount(PAGE_SIZE);
  }, []);

  const renderFilterButton = (cat: string) => {
    const isSelected = selectedCategory === cat;
    const isAffectMe = cat === '影响我';
    const isMonitor = cat === '监控中';
    return (
      <button
        key={cat}
        onClick={() => setSelectedCategory(cat)}
        title={
          isMonitor
            ? `只看命中我监控词的今日新闻（共 ${monitorTodayCount} 条）`
            : cat === '多源印证'
              ? '证据筛选：7 天内不同发布方且标题相似度达到阈值，只说明有多个来源报道，不自动证明内容为真。'
              : cat === '关注'
                ? '关注筛选：手动订阅的标签，以及你收藏的文章。'
                : cat === '我的领域'
                  ? `按设置中的兴趣领域筛选：${interestNames.join('、') || '未设置'}`
                  : cat === '科技'
                    ? '只看科技类权威信源（TechCrunch、The Verge、MIT TR、Ars Technica、Wired、Hacker News、IT 之家等）'
                    : cat === '财经'
                      ? '只看财经类权威信源（FT、WSJ、Reuters、Caixin、经济学人、彭博等）'
                      : cat === '其他'
                        ? '只看综合/科学/全球治理类来源（BBC、Guardian、Nature、Science、AP、NPR、新华网等）'
                  : undefined
        }
        className={`px-3.5 py-1.5 rounded-lg text-xs font-serif whitespace-nowrap transition-all flex items-center space-x-1 border ${
          isSelected
            ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
            : isAffectMe
              ? 'bg-red-50 text-[#E3120B] border-red-200 hover:bg-red-100 font-bold'
              : isMonitor
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 font-bold'
                : cat === '多源印证'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-bold'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
        }`}
      >
        {isAffectMe && <UserCheck className="w-3 h-3 text-[#E3120B]" />}
        {isMonitor && <Radio className="w-3 h-3 text-amber-600" />}
        {cat === '多源印证' && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
        {cat === '关注' && <Bookmark className="w-3 h-3 text-emerald-600" />}
        {cat === '我的领域' && <Target className="w-3 h-3 text-[#0284C7]" />}
        <span>{isMonitor ? '监控中' : cat}</span>
        {isMonitor && (
          <span
            className={`text-[10px] font-mono px-1 rounded ${
              isSelected ? 'bg-white/20 text-amber-100' : 'bg-amber-200/70 text-amber-900'
            }`}
          >
            {monitorTodayCount}
          </span>
        )}
        {isAffectMe && (
          <span className="text-[10px] bg-red-600 text-white px-1 rounded ml-1 scale-90">
            {selectedPersona.name.slice(0, 2)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans">
      {/* 每日核心入口：今日大事脉搏 (Top 3~5 大事、宏观定调、演进状态与2分钟音频) */}
      <DailyFocusPulse
        articles={articles}
        todayArticles={todayFeed}
        briefing={briefing}
        persona={selectedPersona}
        breaking={breaking}
        hotWords={hotWords}
        onSelectArticle={onSelectArticle}
        onOpenAudio={onOpenAudioBriefing}
        onSelectHotWord={handleHotWordSelect}
      />

      {briefing && (
        <MorningBriefingHero
          briefing={briefing}
          persona={selectedPersona}
          onOpenArticle={(articleId) => {
            const article = articles.find((item) => item.id === articleId);
            if (article) onSelectArticle(article);
          }}
          onDismiss={() => onAcknowledgeBriefing?.()}
          onOpenAudio={onOpenAudioBriefing}
          onOpenSettings={() => onOpenSettings?.()}
        />
      )}

      {/* 1. Hero Bar —— 今日简报（词典统计：情绪/热词/突发，口径透明可复核） */}
      <HomeHeroStatus
        stats={heroStats}
        breaking={breaking}
        hotWords={hotWords}
        onOpenBreaking={handleOpenBreaking}
        onSelectHotWord={handleHotWordSelect}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em]">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">事实：可核验</span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">分析：解释判断</span>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">预测：假设前景</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 font-serif font-bold">
          关键事实 {signalSummary.credibilityReady}
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800 font-serif font-bold">
          反方风险 {signalSummary.highRisk.length}
        </span>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-800 font-serif font-bold">
          未来信号 {signalSummary.futureWatch.length}
        </span>
        <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600 font-serif">
          {signalSummary.recommendedAction}
        </span>
      </div>

      <EventTrackingPanel articles={articles} onSelectArticle={onSelectArticle} />

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_320px] gap-6 items-start">
        <main className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  onClick={() => {
                    setTimeHorizon('today');
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    timeHorizon === 'today' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="聚焦今日发布的条目"
                >
                  今日 {todayFeed.length > 0 ? `· ${todayFeed.length}` : '(0)'}
                </button>
                <button
                  onClick={() => {
                    setTimeHorizon('all');
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    timeHorizon === 'all' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="查看语料库全部条目"
                >
                  全部 · {articles.length}
                </button>
              </div>

              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  onClick={() => { setPriorityMode('priority'); setVisibleCount(PAGE_SIZE); }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    priorityMode === 'priority' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="先看最相关、最值得关注的内容"
                >
                  重点优先
                </button>
                <button
                  onClick={() => { setPriorityMode('trust'); setVisibleCount(PAGE_SIZE); }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    priorityMode === 'trust' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="先看更可信、权威度高的报道"
                >
                  可信优先
                </button>
                <button
                  onClick={() => { setPriorityMode('evidence'); setVisibleCount(PAGE_SIZE); }}
                  className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                    priorityMode === 'evidence' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                  title="先看证据充分、可核验的稿件"
                >
                  证据优先
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                {(
                  [
                    { id: 'standard', label: '标准', title: '完整信息·无噪解读' },
                    { id: 'tongsu', label: '通俗', title: '大白话·比喻·零门槛（小白模式）' },
                    { id: 'dehydrated', label: '脱水', title: '30 秒要点·纯干货' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    title={m.title}
                    onClick={() => onSelectReadingMode(m.id)}
                    className={`px-2.5 py-1 rounded-md font-serif font-bold transition-all ${
                      readingMode === m.id ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                onClick={onOpenAudioBriefing}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-serif font-bold rounded-lg border border-amber-600/50 transition-all"
                title="听今日简报（AI 语音，3 分钟晨间解读）"
              >
                <Headphones className="w-3.5 h-3.5" /> 听简报
              </button>
            </div>
          </div>

          <div className="space-y-2 pb-2 border-b border-stone-200">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="w-8 shrink-0 text-[10px] font-serif font-black text-stone-400">主题</span>
              <div className="flex items-center gap-2">
                {categories.topic.map(renderFilterButton)}
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="w-8 shrink-0 text-[10px] font-serif font-black text-stone-400">证据</span>
              <div className="flex items-center gap-2">
                {categories.evidence.map(renderFilterButton)}
              </div>
              <span className="text-[10px] text-stone-400 whitespace-nowrap">多来源不等于事实为真</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="w-8 shrink-0 text-[10px] font-serif font-black text-stone-400">来源</span>
              <div className="flex items-center gap-2">
                {categories.source.map(renderFilterButton)}
              </div>
              <span className="text-[10px] text-stone-400 whitespace-nowrap">按权威信源分类</span>
            </div>
          </div>

          {selectedCategory === '我的领域' && (
            <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-950 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>
                  当前按兴趣领域筛选：<strong>{interestNames.join('、') || '未设置'}</strong>。
                  领域由赛道关键词匹配，新闻可同时属于多个领域。
                </span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="underline underline-offset-2 hover:text-sky-700 font-bold"
                >
                  修改兴趣领域
                </button>
              )}
            </div>
          )}

          {readingMode === 'standard' && (
            <StandardModeFeed
              articles={displayFeed}
              importanceById={importanceById}
              relevanceById={relevanceById}
              authorityById={authorityById}
              rankingMode={rankingMode}
              analysisMode={analysisMode}
              bookmarkedIds={bookmarkedIds}
              followedTags={followedTags}
              onSelectArticle={onSelectArticle}
              onToggleBookmark={onToggleBookmark}
              onToggleFollowTag={onToggleFollowTag}
              radarKeywords={radarKeywords}
              onRemoveRadar={onRemoveRadar}
              onRunSkill={onRunSkill}
              contextArticles={articles}
              onOpenShareCard={onOpenShareCard}
            />
          )}

          {readingMode === 'tongsu' && (
            <Suspense fallback={<div className="py-10 text-center text-xs text-stone-400">正在加载阅读模式…</div>}>
              <TongsuModeFeed
                articles={displayFeed}
                onSelectArticle={onSelectArticle}
                onOpenTermExplain={onOpenTermExplain}
                onRunSkill={onRunSkill}
              />
            </Suspense>
          )}

          {readingMode === 'dehydrated' && (
            <Suspense fallback={<div className="py-10 text-center text-xs text-stone-400">正在加载阅读模式…</div>}>
              <DehydratedModeFeed
                articles={displayFeed}
                onSelectArticle={onSelectArticle}
                onRunSkill={onRunSkill}
              />
            </Suspense>
          )}

          {filteredArticles.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-xl text-sm font-serif font-bold text-stone-500 hover:text-stone-900 bg-white transition-colors"
            >
              再看 {Math.min(PAGE_SIZE, filteredArticles.length - visibleCount)} 条（已显示 {visibleCount}/{filteredArticles.length}）↓
            </button>
          )}
        </main>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">待验证</div>
            <div className="mt-2 space-y-2.5">
              {filteredArticles.slice(0, 2).map((article, idx) => (
                <button
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="w-full text-left rounded-xl border border-stone-200 bg-stone-50 p-2.5 transition hover:border-stone-400 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">0{idx + 1}</span>
                    <span className="text-[9px] font-mono text-stone-400">{article.sourceName || '来源未知'}</span>
                  </div>
                  <div className="mt-1 text-[12px] font-serif font-black text-stone-900 leading-snug line-clamp-2">{article.title}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">风险提醒</div>
            <div className="mt-2 space-y-2">
              {filteredArticles.slice(0, 2).map((article) => {
                const risk = article.bullBearDebate?.bear?.[0]?.point || article.riskReviewText || article.personaForecasts?.[0]?.bear?.scenario || '需持续追踪关键变量。';
                return (
                  <div key={article.id} className="rounded-lg border border-amber-200 bg-white/80 p-2.5">
                    <div className="text-[11px] font-serif font-black text-stone-900 line-clamp-2">{article.title}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-stone-700 line-clamp-2">{String(risk).slice(0, 90)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">建议</div>
            <div className="mt-2 text-[12px] font-serif font-bold text-stone-900 leading-relaxed">
              {(() => {
                const topStory = filteredArticles[0];
                return topStory?.personaImpacts?.find((item) => item.personaId === selectedPersona.id)?.recommendedAction
                  || topStory?.stakeholderImpact?.[0]?.why
                  || '先核实事实来源与时间。';
              })()}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
