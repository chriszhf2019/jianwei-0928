import express from "express";
import { getOrCreateCached, enrichKey } from "./cache";
import { activeProvider, callAI, callAIWithReasoning, providerModel } from "./ai";
import { serverCorpus, persistCorpus, findCorpusArticle } from "./corpus";
import { djb2 } from "./cache";
import { zhFullDate, isoToday, nowHHmm } from "./date";
import {
  PROMPT_VERSIONS,
  attachFieldMeta,
  createFieldMeta,
  sanitizeFrequencyAnalysis,
  sanitizeRegionImpact,
  sanitizeEnrichPayload,
  sanitizeEntityChecks,
} from "./aiValidation";

export const ANTI_FLUFF_AXIOMS = `
【见微核心分析公理：极度针对、严禁片汤话、有理有据、通俗可懂】：
1. 绝对禁绝泛化套话：严禁出现“充满机遇与挑战”、“保持审慎关注”、“有待进一步观察”、“各方观点不一”、“加强防范与监控”、“审慎决策”、“未来值得期待”等任何放在其他事件上也说得通的空话。违者一律属于不合格输出。
2. 必须指名道姓、具体落点：所有主体、机构、技术、政策、环节必须明确写出真实名称（如具体企业名、技术路线、特定法规、财务指标），禁止使用“相关企业”、“有关部门”、“某核心产品”等模糊代称。
3. 必须有理有据，陈述真实传导机制：解释为什么会这样、会如何传导时，必须说明因果传导的商业或物理机制（如：“产能受限导致交付周期拉长”、“毛利率承压挤压研发预算”），禁止把单纯的前后发生当作因果。
4. 必须通俗透彻、直击痛点：用清晰、精准、有力的人话写作，避免生造假大空的晦涩术语，讲清楚对业务、资产或个人真实利益的影响。
5. 必须具备可证伪性：预测与风险必须关联可观测、可计量的具体信号或反向指标，明确指出“在什么具体条件出现时该假设立即被推翻”。`;

export interface RateLimiter { (req: express.Request, res: express.Response, next: express.NextFunction): void; }
export function registerDeepEndpoints(app: express.Express, limit: RateLimiter): void {
  const applyRateLimit = limit;
app.post("/api/enrich", applyRateLimit, async (req, res) => {
  try {
    const { title, content, source, sourceUrl, publishedAt, category, articleId, force } = req.body || {};
    if (!title && !content) {
      return res.status(400).json({ error: "Title or content is required" });
    }

    const provider = activeProvider();
    if (!provider) {
      return res.json({ enriched: false, reason: "no_api_key" });
    }
    const model = providerModel(provider);
    const key = enrichKey({
      title,
      articleId,
      content,
      provider,
      model,
      promptVersion: PROMPT_VERSIONS.enrich,
    });
    const target = articleId ? serverCorpus.find((a: any) => String(a?.id) === String(articleId)) : undefined;

    const prompt = `你是「见微 Genway」的首席深度解构分析师。请为一条外部信源浅层新闻生成《见微》深层认知字段，并严格只输出 JSON（不要任何额外文字）。JSON 结构如下：
{
  "subtitle": "精炼副标题",
  "oneSentenceVerdict": "一句话终局定性",
  "summary": "120 字以内速读摘要",
  "sevenElements": { "what": "发生了什么（事实层，缺失写未说明）", "who": "核心主体（事实层，缺失写未说明）", "when": "关键时间（事实层，缺失写未说明）", "where": "发生地或行业空间（事实层，缺失写未说明）", "why": "深层动因（解释层/推断）", "how": "传导路径（解释层/推断）", "soWhat": "终局影响（解释层/推断）", "aiVerdict": { "confidenceScore": 0, "volatility": "高|中|低", "actionLevel": "行动|关注|观望", "verdictSummary": "" } },
  "logicTree": { "rootCause": "", "nodes": [{ "id": "n-1", "label": "", "category": "cause", "description": "" }, { "id": "n-2", "label": "", "category": "mid_effect", "description": "" }, { "id": "n-3", "label": "", "category": "mid_effect", "description": "" }, { "id": "n-4", "label": "", "category": "market_impact", "description": "" }], "variableWeights": [{ "name": "", "weight": 0, "impactDirection": "up|down|neutral", "description": "" }] },
  "personaImpacts": [{ "personaId": "investor|manager|founder|pm|dev|sales_mkt", "coreImpact": "", "opportunity": "", "threatRisk": "", "recommendedAction": "" }],
  "rippleEffect": { "stages": [{ "stage": "一阶影响", "title": "", "timeframe": "", "items": [""], "severity": "高|中|低" }], "knowledgeGraph": [{ "id": "kg-1", "name": "", "type": "company", "relationToMain": "" }], "multiSources": [{ "sourceName": "", "tier": "", "stance": "正面|中性|负面", "verified": false, "excerpt": "" }] },
  "spectrumLayers": [{ "layer": "micro_signal|interests|logic_chain|data_signal|deduction", "name": "", "color": "#RRGGBB", "headline": "", "content": "", "keyIndicators": [""] }],
  "evidenceChain": [{
    "id": "ev-1",
    "claim": "",
    "sourceFact": "",
    "quote": "输入材料中的原文短引句；没有则留空",
    "sourceName": "来源名称；输入材料未提供则留空",
    "sourceUrl": "真实可访问链接；输入材料未提供则填 null，不得编造",
    "publishedAt": "来源发布时间；未知则 null",
    "sourceType": "primary_document|official_statement|reported_media|unknown",
    "relation": "supports|contradicts|context",
    "reliability": "可靠性依据说明",
    "confidenceScore": 0
  }],
  "tongsuSummary": { "simpleSay": "用大白话把整件事讲一遍（像对完全不懂行业的朋友解释，不用任何术语，2-4 句）", "whyExplanation": "用一个生活化比喻解释为什么会这样", "whatItMeans": "对普通人/你来说，这件事直接意味着什么（1-2 句大白话）", "jargonTerms": ["文中出现的术语/黑话，用于点击释义", "…"] },
  "dehydratedItems": { "coreEntity": "核心主体（公司/机构/人名）", "keyAction": "一句话：它干了什么/发生了什么", "relatedCount": 3, "coreShifts": ["核心变化1（要点式）", "核心变化2", "核心变化3"], "impactHighlights": ["对谁有什么影响", "关键看点"] },
   "backstoryTimeline": [{ "date": "时间节点（如 2026-05 或具体日期；不确定写约）", "event": "此前发生的相关事件一句话", "relevance": "它与今天这篇的关系（铺垫/诱因/进展/背景，一句话）" }],
   "stakeholderImpact": [{ "name": "受影响方名称（公司/机构/人群/行业）", "type": "company|government|person|group|industry|market", "direction": "benefit|pressure|neutral", "strength": 1, "why": "为什么受益/承压（一句话，克制可复核）" }],
   "coreLogic": { "essence": "事情的本质/底层逻辑一句话（跳出新闻本身的第一性概括）", "points": ["核心逻辑1（结构性机制）", "核心逻辑2", "核心逻辑3"], "counterIntuitive": "最反直觉/容易被误读的一点（或留空）" },
   "bullBearDebate": { "bull": [{ "point": "正方论点（支持/看多）", "basis": "依据或隐含假设，一句话" }], "bear": [{ "point": "反方论点（质疑/看空）", "basis": "依据或隐含假设，一句话" }], "coreDispute": "双方真正的分歧焦点（双方都在争什么）一句话", "read": "当前力量判断：哪方论据更硬、或取决于什么关键条件（一句话，克制）" }
}
标题：${title || "无标题"}
来源：${source || "外部信源"}
原文链接：${sourceUrl || "未提供"}
来源发布时间：${publishedAt || "未提供"}
分类：${category || "外部信源"}
正文/要点：${content || "请基于标题给出克制、可复核的分析"}。请遵循“报刊为骨，数据为翼”，避免臆造硬数据；无法核实的数字用定性表述。
多源规则：multiSources 只能列出输入材料中明确出现、且能找到对应表述的来源。没有可核验来源线索时必须返回 []，不得根据常识补媒体名或把模型记忆当作“已核实”。
七要素规则：what/who/when/where 是事实层，只能写输入材料可查证的内容，缺失写“未说明”，不得用常识补全；why/how/soWhat 是解释层，必须基于前四项事实展开，并写出依据或条件，不能凭空定性。aiVerdict.verdictSummary 只做相对判断，不冒充事实。
因果链规则：logicTree.rootCause 是始发根因（必要起点），nodes 按 cause → mid_effect → market_impact 顺序排列；每个节点必须说明“上一步如何传导到这一步”，不得把仅同时发生、相关性或背景信息当作因果；variableWeights 只表达方向性相对重要性，不是概率。
涟漪规则：rippleEffect.stages 固定按“一阶影响 → 二阶影响 → 三阶影响”时间递进、影响范围逐步扩散；每阶写清“谁最先被影响 / 会连锁到哪些环节 / 长期重塑什么”，title/items 用条件假设表达，timeframe 与 severity 是估计范围不是概率；knowledgeGraph 只做实体与产业定位，不冒充因果。
身份影响规则：personaImpacts 必须按各身份的真实立场分别落点，coreImpact 写最直接变化，opportunity/threatRisk 用条件假设，recommendedAction 用“若…可考虑…”句式；不得六个身份写成一套话，也不得给确定性买卖或投资指令。
注意：tongsuSummary.simpleSay 必须是把本条新闻从头讲清楚的完整大白话（讲清楚“谁、干了什么、为什么、影响谁”），不要只写一句口号；whyExplanation 用类比让小白秒懂；jargonTerms 至少 2 个（若有术语）。
bullBearDebate：给这场正反方博弈建模——bull 列 2-3 条支持方/乐观方论点（point+basis），bear 列 2-3 条反对方/质疑方论点；coreDispute 点出双方真正的分歧焦点；read 给出当前力量判断（哪方论据更硬、或结果取决于什么），克制不喊单。
coreLogic：给出这件事的底层逻辑分析——essence 用一句话讲清本质（第一性视角，不用事件名复述）；points 列 2-4 条结构性核心逻辑（驱动机制/约束/利益结构/演化规则）；counterIntuitive 点出最反直觉或最易误读处（没有就空字符串）。
stakeholderImpact：列出受本事件影响的主要相关方 3-6 个（含类型与方向：benefit=受益/pressure=承压/neutral=中性，strength 1-5 表示影响强度），why 用可复核表述，宁缺毋滥。
backstoryTimeline：给出今天这篇之前的 3-6 个关键相关节点（时间正序，最久远在前），只列确属铺垫/诱因/同类进展的节点，宁缺毋滥；不确定时间用“约”；若确实没有值得写的前情，返回空数组 []。
${ANTI_FLUFF_AXIOMS}`;

    const generated = await getOrCreateCached(key, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return sanitizeEnrichPayload(parsed);
    }, { force });
    const parsed = generated.data;
    const wasCached = generated.cached || generated.deduped;
    const fieldMeta = createFieldMeta(provider, model, PROMPT_VERSIONS.enrich);

    // 深度解析结果写回语料：刷新后仍算“已深度解读”（当日口径的“深度解读”计数因此持久）
    if (articleId) {
      if (target) {
        const deepKeys = [
          "sevenElements", "logicTree", "personaImpacts", "rippleEffect", "spectrumLayers",
          "evidenceChain", "industrySignals", "oneSentenceVerdict", "subtitle", "summary",
          "coreQuote", "quoteAuthor", "tongsuSummary", "dehydratedItems", "backstoryTimeline", "stakeholderImpact", "coreLogic", "bullBearDebate",
        ];
        for (const k of deepKeys) {
          if (parsed?.[k] !== undefined && parsed[k] !== null) target[k] = parsed[k];
        }
        attachFieldMeta(target, deepKeys.filter((k) => parsed?.[k] !== undefined && parsed[k] !== null), fieldMeta);
        // 若仍为浅层默认，标记为已补全（避免首页卡片误判“待补全”）
        if (Array.isArray(target.spectrumLayers) && target.spectrumLayers.length > 0) {
          target.spectrumLayers = target.spectrumLayers;
        }
        persistCorpus();
      }
    }

    res.json({
      enriched: true,
      cached: wasCached,
      overrides: { ...parsed, ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}) },
      fieldMeta,
    });
  } catch (err: any) {
    console.error("Enrich error:", err);
    res.json({ enriched: false, reason: "error" });
  }
});

// —— 地区影响解读：按用户点击的“地区 × 行业”组合，对相关真实文章做一次条件推演 ——
app.post("/api/region/interpret", applyRateLimit, async (req, res) => {
  const region = String(req.body?.region || "").trim().slice(0, 80);
  const sector = String(req.body?.sector || "").trim().slice(0, 120);
  const articles = Array.isArray(req.body?.articles)
    ? req.body.articles.slice(0, 12).map((item: any) => ({
        title: String(item?.title || "").trim().slice(0, 240),
        source: String(item?.source || "").trim().slice(0, 120),
        publishedAt: String(item?.publishedAt || "").trim().slice(0, 80),
        summary: String(item?.summary || "").trim().slice(0, 900),
      })).filter((item: any) => item.title || item.summary)
    : [];
  if (!region || !sector || articles.length === 0) {
    return res.status(400).json({ error: "region, sector and articles are required" });
  }

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `regioninterpret:${djb2([
    region,
    sector,
    JSON.stringify(articles),
    provider,
    model,
    PROMPT_VERSIONS.region_interpret,
  ].join("\n"))}`;
  const prompt = `你是「见微 Genway」的地区影响推演分析师。请仅依据输入的真实文章材料，解释一个“地区 × 行业”组合，严格只输出 JSON：
{
  "whyHere": "为什么会在这个地区、这个行业出现这批事件；区分材料明确事实与模型推断，1-3 句",
  "drivers": ["主要原因1", "主要原因2", "主要原因3"],
  "crossRegion": [
    {
      "target": "可能受到传导的地区、行业或主体",
      "direction": "benefit|pressure|mixed",
      "mechanism": "影响如何传导，一句话",
      "confidence": "高|中|低"
    }
  ],
  "watch": ["接下来可核验的观察指标1", "观察指标2", "观察指标3"],
  "guidance": "给决策者的下一步指引：观察、核验或行动，1-2 句",
  "limits": "判断边界：哪些内容材料没有说明，什么情况会让上述推演失效"
}
地区：${region}
行业：${sector}
真实文章材料：${JSON.stringify(articles)}
要求：drivers 2-4 条，crossRegion 2-5 条，watch 2-5 条；不得补造数字、政策、公司动作或来源；没有依据时写“现有材料未说明”；crossRegion 是条件传导假设，不是概率预测。
${ANTI_FLUFF_AXIOMS}`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.25 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return sanitizeRegionImpact(parsed);
    });
    res.json({ ok: true, cached: generated.cached || generated.deduped, data: generated.data });
  } catch (err) {
    console.error("Region interpret error:", err);
    res.json({ ok: false, reason: "error" });
  }
});

// —— 频发归因：按用户选择的赛道，基于真实文章生成“为什么近期集中发生”的条件解释 ——
app.post("/api/intelligence/frequency", applyRateLimit, async (req, res) => {
  const topic = String(req.body?.topic || "").trim().slice(0, 120);
  const windowDays = Math.max(1, Math.min(90, Number(req.body?.windowDays) || 30));
  const articles = Array.isArray(req.body?.articles)
    ? req.body.articles.slice(0, 16).map((item: any) => ({
        title: String(item?.title || "").trim().slice(0, 240),
        source: String(item?.source || "").trim().slice(0, 120),
        publishedAt: String(item?.publishedAt || "").trim().slice(0, 80),
        summary: String(item?.summary || "").trim().slice(0, 900),
      })).filter((item: any) => item.title || item.summary)
    : [];
  if (!topic || articles.length === 0) {
    return res.status(400).json({ error: "topic and articles are required" });
  }

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `frequencyanalysis:${djb2([
    topic,
    String(windowDays),
    JSON.stringify(articles),
    provider,
    model,
    PROMPT_VERSIONS.frequency_analysis,
  ].join("\n"))}`;
  const prompt = `你是「见微 Genway」的频发事件归因分析师。请仅依据输入的真实文章，解释为什么某个主题在近期集中出现，严格只输出 JSON：
{
  "observedPattern": "先描述观察到的频发模式：时间范围、主题、文章与来源覆盖；只写输入能够支持的内容",
  "possibleDrivers": [
    {
      "driver": "候选原因",
      "evidence": "输入中的支持证据，一句话；没有证据就写现有材料未说明",
      "mechanism": "这个原因如何可能导致事件集中出现，一句话",
      "confidence": "高|中|低"
    }
  ],
  "alternativeExplanation": "同样能够解释频发现象的替代原因，例如报道周期、热点炒作、来源集中或统计口径",
  "watch": ["可验证的频率原因观察信号1", "观察信号2", "观察信号3"],
  "limits": "哪些因果关系尚未被证明，以及材料缺少什么"
}
主题：${topic}
观察窗口：近 ${windowDays} 天
真实文章材料：${JSON.stringify(articles)}
要求：possibleDrivers 2-4 条，watch 2-5 条；因果只能是候选假设，不得写成已证实结论；不得补造政策、数字、公司动作或来源；要主动考虑“只是同一媒体连续报道”这种替代解释。
${ANTI_FLUFF_AXIOMS}`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.25 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return sanitizeFrequencyAnalysis(parsed);
    });
    res.json({ ok: true, cached: generated.cached || generated.deduped, data: generated.data });
  } catch (err) {
    console.error("Frequency analysis error:", err);
    res.json({ ok: false, reason: "error" });
  }
});

/** 技能型单项生成公共骨架：定位文章 → 查缓存 → 调 AI → 写回对应字段 */
async function runSingleSkill(
  req: any,
  res: any,
  opts: {
    field: string;
    skillKey: string;
    certificationStandard?: "ai_single" | "scenario";
    buildPrompt: (input: {
      title: string;
      source: string;
      sourceUrl: string;
      publishedAt: string;
      category: string;
      content: string;
    }) => string;
  }
) {
  const { title, content, source, sourceUrl, publishedAt, category, articleId } = req.body || {};
  if (!title && !content) return res.status(400).json({ error: "Title or content is required" });

  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `${opts.skillKey}:${djb2([
    String(articleId || "").trim(),
    String(title || "").trim(),
    String(content || "").trim(),
    provider,
    model,
    PROMPT_VERSIONS.skill,
  ].join("\n"))}`;

  const prompt = opts.buildPrompt({
    title: String(title || "无标题"),
    source: String(source || "外部信源"),
    sourceUrl: String(sourceUrl || ""),
    publishedAt: String(publishedAt || ""),
    category: String(category || "外部信源"),
    content: String(content || ""),
  }) + `\n${ANTI_FLUFF_AXIOMS}`;
  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      const cleaned = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? sanitizeEnrichPayload(parsed)
        : parsed;
      return cleaned?.[opts.field] && typeof cleaned[opts.field] === "object"
        ? cleaned[opts.field]
        : cleaned;
    });
    const value = generated.data;
    const wasCached = generated.cached || generated.deduped;
    const target = articleId ? serverCorpus.find((a: any) => String(a?.id) === String(articleId)) : undefined;
    const fieldMeta = createFieldMeta(
      provider,
      model,
      PROMPT_VERSIONS.skill,
      opts.certificationStandard || "ai_single"
    );
    if (target) {
      target[opts.field] = value;
      attachFieldMeta(target, [opts.field], fieldMeta);
      persistCorpus();
    }
    res.json({
      ok: true,
      cached: wasCached,
      overrides: {
        [opts.field]: value,
        ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
      },
      fieldMeta,
    });
  } catch (err: any) {
    console.error(`${opts.skillKey} error:`, err);
    res.json({ ok: false, reason: "error" });
  }
}

// —— 技能①：用大白话把这条新闻完整讲一遍（小白/通俗模式）——
app.post("/api/skill/plain", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "tongsuSummary",
    skillKey: "plain",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的“小白讲解员”。请把下面这条新闻，用完全不懂行的大白话从头到尾讲一遍，严格只输出 JSON：
{
  "simpleSay": "用大白话把整件事讲完整（像对朋友解释：谁、干了什么、为什么、影响谁；2-4 句，零术语）",
  "whyExplanation": "用一个生活日常比喻解释“为什么会这样”",
  "whatItMeans": "对普通人直接意味着什么（1-2 句）",
  "jargonTerms": ["原文出现的术语/黑话，供点击释义", "至少2个（若有）"]
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题用克制、可复核的表述讲解"}
要求：simpleSay 必须是完整叙述而不是口号；禁止臆造原文没有的硬数据，无法核实的用定性说法。`,
  })
);

// —— 技能②：30 秒脱水干货（核心变化 + 影响要点）——
app.post("/api/skill/dehydrate", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "dehydratedItems",
    skillKey: "dehydrate",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的“速读压缩师”。请把下面这条新闻压成 30 秒可读完的干货清单，严格只输出 JSON：
{
  "coreEntity": "核心主体（公司/机构/人名/产品）",
  "keyAction": "一句话：它干了什么/发生了什么",
  "relatedCount": 3,
  "coreShifts": ["核心事实变化1", "核心事实变化2", "核心事实变化3"],
  "impactHighlights": ["对谁有什么影响", "关键看点"]
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题压缩"}
要求：coreShifts 每项一句话直给要点；impactHighlights 写清“影响谁、怎样影响”；禁止编造原文没有的硬数据。`,
  })
);

// —— 技能③：AI 综合解读（判断 / 依据 / 影响 / 边界）——
app.post("/api/skill/interpret", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "aiInterpretation",
    skillKey: "interpret",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的新闻综合解读员。请对下面这条新闻做简短、克制、可复核的 AI 解读，严格只输出 JSON：
{
  "aiInterpretation": {
    "core": "核心判断：这件事最值得记住的结论，一句话",
    "basis": "关键依据：支撑判断的事实或机制，一句话",
    "impact": "主要影响：最需要关注的变化或受影响方，一句话",
    "limits": "判断边界：哪里仍不确定，或什么情况会推翻判断，一句话",
    "grayscale": {
      "memberships": [
        { "hypothesis": "假设A，例如产业利好", "score": 72 },
        { "hypothesis": "假设B，例如产业利空", "score": 28 }
      ],
      "evidenceStrength": "高|中|低",
      "support": ["支持该组判断的事实或机制1", "支持证据2"],
      "oppose": ["反对证据或相反事实1", "反对证据2"],
      "uncertain": ["目前无法确认的变量1", "不确定变量2"],
      "reverseRisks": ["潜在反向风险点1", "反向风险点2"],
      "decisionReason": "为什么当前只能观察，或为什么可以进入行动评估"
    }
  }
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题解读"}
要求：四项各一句；grayscale.memberships 2-4 条，score 为 0-100 的模型隶属度，不是校准概率；support/oppose/uncertain 各 2-4 条，必须区分材料事实与模型推断；reverseRisks 1-3 条；只基于输入材料，不补造事实、数字或来源；证据不足时写“现有信息有限，需继续核验”。不要自行输出最终行动结论，系统会按阈值计算。`,
  })
);

// —— 技能④：精简七要素（7W）——
app.post("/api/skill/sevenw", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "sevenWBrief",
    skillKey: "sevenw",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的新闻结构分析员。请用 7W 精简概括下面这条新闻，严格只输出 JSON：
{
  "sevenWBrief": {
    "what": "发生了什么，一句话（事实层）",
    "who": "核心主体，一句话（事实层）",
    "when": "关键时间，没有就写未说明（事实层）",
    "where": "事件发生地或行业空间，没有就写未说明（事实层）",
    "why": "主要动因，一句话（解释层，需写依据）",
    "how": "实现路径，一句话（解释层，需写机制）",
    "soWhat": "最重要的影响，一句话（解释层，需写条件）"
  }
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题概括"}
要求：每项只写一句，合计约 100-180 字；事实层只概括输入材料可查证内容，无法判断时写“未说明”；解释层必须由事实层推导，并写出依据或条件，不得凭空定性。`,
  })
);

// 旧版 verdict 技能已移除：
// 定性由 enrich 的 oneSentenceVerdict / sevenElements.aiVerdict 统一提供，原端点产出无 UI 展示（死字段）。

// —— 技能⑤：趋势情景（短期/中期/关键变量/失效条件）——
app.post("/api/skill/trend", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "trendForecastText",
    skillKey: "trend",
    certificationStandard: "scenario",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的趋势情景分析师。请为下面这条新闻建立四行趋势模型，严格只输出 JSON：
{
  "shortTerm": "短期（1-3 个月）最可能的变化，一句话",
  "midTerm": "中期（3-12 个月）关键演化，一句话",
  "keyVariables": "需要持续观察的 1-3 个变量或信号，一句话",
  "invalidation": "出现什么条件时上述判断失效，一句话"
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：字段值只写内容，不重复“短期/中期/关键变量/失效条件”等标签，不写“一句话”；四项各一句，总计约 100-160 字；写条件变化和可核验信号，不重复新闻事实；不编造概率、比例或时间点；证据不足时写“现有信息不足以支撑强判断”。`,
  })
);

// —— 技能⑥：风险审稿（风险/误解/盲点/指标）——
app.post("/api/skill/risk", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "riskReviewText",
    skillKey: "risk",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的对抗性审稿人（红队思维）。请为下面这条新闻建立四行风险模型，严格只输出 JSON：
{
  "mainRisk": "最重要的下行风险，并指出受影响方，一句话",
  "misread": "这条新闻最容易被怎样误读，一句话",
  "blindSpot": "报道没有说明但会影响判断的关键盲点，一句话",
  "watchMetrics": "接下来可核验的关注指标，一句话"
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：字段值只写内容，不重复“主要风险/易误读/盲点/关注指标”等标签，不写“一句话”；四项各一句，总计约 100-160 字；只基于输入材料和可普遍核验的公开常识；无法判断时写“未说明”；不编造数据，不为制造冲突而夸大。`,
  })
);

// —— 技能⑦：全景时间轴（只生成前情节点数组 backstoryTimeline）——
app.post("/api/skill/timeline", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "backstoryTimeline",
    skillKey: "timeline",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的新闻编年史梳理者。请梳理今天这条新闻【之前】的关键相关事件，严格只输出 JSON 数组（不要对象外壳）：
[
  { "date": "时间节点（尽量精确到年月；不确定写约2026年X月）", "event": "此前发生的相关事件一句话", "relevance": "它与今天这篇的关系（铺垫/诱因/同类进展/背景，一句话）" }
]
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：只列 3-6 个确属铺垫/诱因/同类进展的节点，时间正序（最久远在前），宁缺毋滥；不确定的用“约”；若确实没有值得写的前情，输出空数组 []。`,
  })
);

// —— 技能⑧：影响力与利益相关方分析（stakeholderImpact）——
app.post("/api/skill/stakeholders", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "stakeholderImpact",
    skillKey: "stakeholders",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的影响分析顾问。请分析下面这条新闻的主要受影响方（利益相关方），严格只输出 JSON 数组（不要对象外壳）：
[
  { "name": "受影响方名称（公司/机构/人群/行业）", "type": "company|government|person|group|industry|market", "direction": "benefit|pressure|neutral", "strength": 1, "why": "为什么受益/承压（一句话，克制可复核）" }
]
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：列出 3-6 个主要受影响方；direction=benefit 受益 / pressure 承压 / neutral 中性；strength 1-5 表示影响强度；why 说明理由，不臆造硬数据；宁缺毋滥。`,
  })
);

// —— 技能⑨：底层逻辑分析（coreLogic：本质 + 核心逻辑）——
app.post("/api/skill/corelogic", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "coreLogic",
    skillKey: "corelogic",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的第一性原理分析师。请剖析下面这条新闻的底层逻辑（本质与核心机制），严格只输出 JSON 对象：
{
  "essence": "事情的本质/底层逻辑一句话（第一性概括，不重复事件本身）",
  "points": ["核心逻辑1（结构性机制，如驱动的稀缺资源、约束条件、利益结构、演化规则）", "核心逻辑2", "核心逻辑3"],
  "counterIntuitive": "最反直觉或最易被误读的一点（没有则留空字符串）"
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：essence 一句话直击本质；points 列 2-4 条，每条约 20-40 字、讲机制不讲新闻复述；counterIntuitive 点出外行最容易想反的地方；克制、不臆造数据。`,
  })
);

// —— 技能⑩：正反方博弈（bullBearDebate）——
app.post("/api/skill/debate", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "bullBearDebate",
    skillKey: "debate",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的辩论建模师。请为下面这条新闻做"正反方博弈"分析，严格只输出 JSON 对象：
{
  "bull": [{ "point": "正方论点（支持/乐观方）", "basis": "依据或隐含假设，一句话" }],
  "bear": [{ "point": "反方论点（质疑/悲观方）", "basis": "依据或隐含假设，一句话" }],
  "coreDispute": "双方真正的分歧焦点（在争什么）一句话",
  "read": "当前力量判断：哪方论据更硬、或结果取决于什么关键条件（一句话，克制）"
}
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：bull 与 bear 各 2-3 条、针锋相对；basis 尽量落到可复核的事实/机制；coreDispute 与 read 各一句话；克制、不喊单、不臆造数据。`,
  })
);

// —— 技能⑪：AI 补充相关报道线索（relatedNews；AI 记忆召回，非实时联网）——
app.post("/api/skill/relatednews", applyRateLimit, (req, res) =>
  runSingleSkill(req, res, {
    field: "relatedNews",
    skillKey: "relatednews",
    buildPrompt: ({ title, source, category, content }) =>
      `你是「见微 Genway」的编辑推荐员。基于你的知识，为下面这条新闻推荐 3-5 条"值得一并阅读的相关报道"（同题材/同主体/后续进展的知名媒体稿件），严格只输出 JSON 数组（不要对象外壳）：
[
  { "title": "相关报道标题", "media": "媒体/机构名", "why": "为什么值得一起看（跟进/背景/反方/后续，一句话）" }
]
标题：${title}
来源：${source}
分类：${category}
正文/要点：${content || "请基于标题"}
要求：只列知名媒体确实报道过的题材，宁缺毋滥；若无把握，输出空数组 []。`,
  })
);

// —— 技能⑫：对象回应与公司实况核查（entityChecks；AI 记忆召回 + 待核验）——
app.post("/api/skill/entitycheck", applyRateLimit, async (req, res) => {
  const { articleId, title, content, source, category, entityMentions } = req.body || {};
  if (!title && !content) return res.status(400).json({ error: "Title or content is required" });
  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const entities = Array.isArray(entityMentions) ? entityMentions.slice(0, 8) : [];
  const entityList = entities
    .map((e: any) => `${e?.name || ""}${e?.type ? `（${e.type}）` : ""}`)
    .filter(Boolean)
    .join("、") || "（正文中未明确提取到实体，请根据标题与正文自行识别 2-5 个主要对象）";

  const cacheKey = `entitycheck:${djb2([
    String(articleId || ""),
    String(title || ""),
    String(content || ""),
    entityList,
    provider,
    model,
    PROMPT_VERSIONS.entity_check,
  ].join("\n"))}`;

  const prompt = `你是「见微 Genway」的对象核查员。请针对下面这条新闻中被谈到的对象，做两件事：① 判断该对象是否针对这条新闻公开回应/表态；② 深挖该对象（尤其公司）的实际经营情况。严格只输出 JSON 对象：
{
  "entityChecks": [
    {
      "entityName": "对象名称（公司/机构/人物）",
      "entityType": "company|government|person|industry|market|其他",
      "responseStatus": "有公开回应|未见公开回应|待核验",
      "responseSummary": "若材料或你的知识中有该对象针对此事的公开表态/回应，用一句可复核的话概括；没有就写“未说明”",
      "responseSourceHint": "回应来源类型（官方声明/财报电话会/媒体采访/发言人/未说明）",
      "responseUrl": "若能给出真实可访问的官方链接则填写，否则填 null",
      "responseQuote": "可核验的原文短引句，没有则留空",
      "companyProfile": "主营/商业模式（面向公司的实况深挖；非公司对象可写身份定位）",
      "keyFinancials": "规模/关键经营数据（仅用公开常识，不能保证实时；无法确认写“待核验”）",
      "recentDynamics": ["近期相关动态1", "近期相关动态2"],
      "riskPoints": ["经营风险/争议点1", "风险点2"]
    }
  ]
}
标题：${title || "无标题"}
来源：${source || "外部信源"}
分类：${category || "外部信源"}
正文/要点：${content || "请基于标题克制判断"}
主要对象：${entityList}
规则：
1. 这是 AI 记忆召回 + 输入材料推断，不是实时联网核实；“未见公开回应”只表示输入材料未显示回应，不能写成“经核实无人回应”。
2. keyFinancials 等经营数据若不在输入材料中，只能给“待核验”或极克制的定性描述，不得编造精确数字、市值、收入或股价。
3. responseUrl 必须真实可访问，拿不准就 null；responseQuote 必须能对应原文，不能改写。
4. 每个对象 1 条，最多 8 条，宁缺毋滥；不要给确定性买卖或投资指令。
${ANTI_FLUFF_AXIOMS}`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return parsed;
    });
    const rawChecks = Array.isArray(generated.data) ? generated.data : generated.data?.entityChecks;
    const entityChecks = sanitizeEntityChecks(rawChecks);
    const target = articleId ? serverCorpus.find((a: any) => String(a?.id) === String(articleId)) : undefined;
    if (target) {
      target.entityChecks = entityChecks;
      attachFieldMeta(target, ["entityChecks"], createFieldMeta(provider, model, PROMPT_VERSIONS.entity_check, "ai_single"));
      persistCorpus();
    }
    res.json({
      ok: true,
      cached: generated.cached || generated.deduped,
      overrides: {
        entityChecks,
        ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
      },
      fieldMeta: createFieldMeta(provider, model, PROMPT_VERSIONS.entity_check, "ai_single"),
    });
  } catch (err: any) {
    console.error("entitycheck error:", err);
    res.json({ ok: false, reason: "error" });
  }
});

// —— 技能⑬：身份化「正反双向预测」（personaForecast；服务“我的身份”视角）——
// 与 runSingleSkill 不同：① 需要 personaId 维度；② 结果按 personaId upsert 进 personaForecasts 数组；
// 概率带只用 低/中/高（模型估计），杜绝伪精确百分比。
app.post("/api/skill/personaforecast", applyRateLimit, async (req, res) => {
  const { articleId, title, content, source, category, personaId, personaName, personaDesc, extraContext } = req.body || {};
  if (!title && !content) return res.status(400).json({ error: "Title or content is required" });
  const pid = String(personaId || "default");
  const provider = activeProvider();
  if (!provider) return res.json({ ok: false, reason: "no_api_key" });
  const model = providerModel(provider);
  const cacheKey = `personaforecast:${djb2([
    String(articleId || "").trim(),
    String(title || "").trim(),
    String(content || "").trim(),
    pid,
    provider,
    model,
    PROMPT_VERSIONS.skill,
  ].join("\n"))}`;
  const target = articleId
    ? serverCorpus.find((a: any) => String(a?.id) === String(articleId))
    : undefined;

  // 按 personaId upsert 并写回语料
  const upsertWrite = (item: any) => {
    const stamped = { ...(item || {}), personaId: item?.personaId || pid, generatedAt: new Date().toISOString() };
    if (target) {
      const list = Array.isArray(target.personaForecasts) ? (target.personaForecasts as any[]) : [];
      const idx = list.findIndex((x) => x?.personaId === stamped.personaId);
      if (idx >= 0) list[idx] = stamped; else list.push(stamped);
      target.personaForecasts = list;
      persistCorpus();
    }
    return stamped;
  };

  const prompt = `你是「见微 Genway」的身份化双向预测建模师。请以“身份透镜”视角，为下面这条新闻做【该身份人物】的正反双向预测：既推演“事件若沿乐观路径发展，此身份会在哪些方面受益、如何兑现”，也推演“若沿悲观路径发展，会在哪些方面受损、如何兑现”。两个方向都必须给出可验证的情景、触发条件与证伪信号。严格只输出 JSON 对象（不要任何额外文字、不要 Markdown）：
{
  "personaId": "${pid}（原样返回）",
  "horizon": "主推演时间窗（如 3-6 个月；据事件性质可调，写中文）",
  "directionBias": "positive|negative|mixed（综合判断：主线当前更可能利好还是利空该身份）",
  "bull": {
    "scenario": "正向情景：事件如何展开会兑现该身份的利好（2-4 句，落到可感知的具体结果，不要空话）",
    "band": "高|中|低（该情景兑现的概率带估计）",
    "horizon": "该路径大致时间窗",
    "payoff": "对此身份最具体的受益点（一句话）",
    "triggers": ["触发条件1（若……则……）", "触发条件2", "触发条件3"],
    "falsify": ["该路径被证伪的信号（出现即此路不通，1-2 条）"]
  },
  "bear": {
    "scenario": "反向情景：事件如何展开会兑现该身份的风险（2-4 句）",
    "band": "高|中|低",
    "horizon": "该路径大致时间窗",
    "impact": "对此身份最具体的受损点（一句话）",
    "triggers": ["触发条件1（若……则……）", "触发条件2", "触发条件3"],
    "falsify": ["该路径被证伪的信号（1-2 条）"]
  },
  "keyMonitor": "一句话建议：盯住哪个指标/事件能验证哪条路径更可能兑现"
}
身份：${personaName || "该身份人物"}（定位：${personaDesc || "关注这条新闻对其自身与所处角色的影响"}）
标题：${title || "无标题"}
来源：${source || "外部信源"}
分类：${category || "外部信源"}
正文/要点：${content || "请基于标题克制推断"}
已有上下文（供参考，勿编造与之矛盾的硬数据）：
${extraContext || "（暂无；请基于标题与常识，信息不足时在 scenario 中明确写‘取决于……’）"}
要求：band 只是模型估计、务必克制；triggers/falsify 必须具体到可观察的数据或事件；不得臆造硬数据；信息不足就明说取决于什么。scenario/band 均为 AI 观点而非事实结论。
${ANTI_FLUFF_AXIOMS}`;

  try {
    const generated = await getOrCreateCached(cacheKey, async () => {
      const text = await callAI(prompt, { json: true, temperature: 0.3 });
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return Array.isArray(parsed) ? parsed[0] : parsed?.bull && parsed?.bear ? parsed : parsed?.personaForecast;
    });
    const stamped = upsertWrite(generated.data || {});
    const fieldMeta = createFieldMeta(provider, model, PROMPT_VERSIONS.skill);
    if (target) attachFieldMeta(target, ["personaForecasts"], fieldMeta);
    return res.json({
      ok: true,
      cached: generated.cached || generated.deduped,
      overrides: {
        personaForecasts: target ? target.personaForecasts : [stamped],
        ...(target?.aiFieldMeta ? { aiFieldMeta: target.aiFieldMeta } : {}),
      },
      fieldMeta,
    });
  } catch (err: any) {
    console.error("personaforecast error:", err);
    return res.json({ ok: false, reason: "error" });
  }
});
}
