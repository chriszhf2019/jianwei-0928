import type { NewsArticle } from '../types';
import { articleSortTime } from './articleTime';
import { mediaProfile } from './mediaAuthority';
import { sourceGroupInfo, sourceGroupKeyForArticle } from './sourceGrouping';

export type EvidenceStatus =
  | 'corroborated'
  | 'official-single'
  | 'single-source'
  | 'unverified';

export interface EvidenceProfile {
  status: EvidenceStatus;
  /** 按当前语料标题相似度聚合后，实际出现的不同发布方数量。 */
  independentSources: number;
  sourceNames: string[];
  occurrenceCount: number;
  corroboratingArticleIds: string[];
  hasOriginalLink: boolean;
  hasPublishedTime: boolean;
  /** AI 文本中列出的来源线索；仅用于提示，不参与独立来源计数。 */
  aiClaimedSources: number;
  title: string;
  note: string;
}

const COMMON_TITLE_WORDS = [
  '重磅',
  '最新',
  '突发',
  '快讯',
  '独家',
  '官方',
  '回应',
  '宣布',
  '消息',
  '报道',
];

const evidenceProfileCache = new WeakMap<
  object,
  WeakMap<object, Map<number, EvidenceProfile>>
>();

export interface SimilarityMatch {
  article: NewsArticle;
  similarity: number;
}

interface TitleParts {
  text: string;
  grams: Map<string, number>;
  size: number;
}

const similarityIndexCache = new Map<string, Map<string, SimilarityMatch[]>>();
const SIMILARITY_INDEX_CACHE_LIMIT = 8;

function titleParts(text: string): TitleParts {
  return {
    text,
    grams: bigrams(text),
    size: text.length === 0 ? 0 : text.length === 1 ? 1 : text.length - 1,
  };
}

function partsSimilarity(a: TitleParts, b: TitleParts): number {
  if (!a.text || !b.text) return 0;
  if (a.text === b.text) return 1;
  const shorter = a.text.length <= b.text.length ? a : b;
  const longer = shorter === a ? b : a;
  if (shorter.text.length >= 8 && longer.text.includes(shorter.text)) return 0.88;

  let intersection = 0;
  let union = 0;
  for (const [gram, count] of a.grams) {
    const other = b.grams.get(gram) || 0;
    intersection += Math.min(count, other);
    union += Math.max(count, other);
  }
  for (const [gram, count] of b.grams) {
    if (!a.grams.has(gram)) union += count;
  }
  return union > 0 ? intersection / union : 0;
}

function similarityIndexKey(corpus: readonly NewsArticle[], threshold: number): string {
  let key = `${threshold}:${corpus.length}`;
  for (const article of corpus) key += `|${String(article.id)}:${normalizeHeadline(article.title)}`;
  return key;
}

/**
 * 为整批语料一次性建立标题相似度索引，后续事件聚类与证据档案复用，
 * 避免对每篇文章都做一次全量线性扫描（原实现是 O(n^2) 的调用叠加）。
 */
export function buildSimilarityIndex(
  corpus: readonly NewsArticle[],
  threshold: number
): Map<string, SimilarityMatch[]> {
  const key = similarityIndexKey(corpus, threshold);
  const cached = similarityIndexCache.get(key);
  if (cached) {
    similarityIndexCache.delete(key);
    similarityIndexCache.set(key, cached);
    return cached;
  }

  const entries = corpus.map((article) => ({
    article,
    parts: titleParts(normalizeHeadline(article.title)),
  }));
  const postings = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    for (const gram of entry.parts.grams.keys()) {
      let list = postings.get(gram);
      if (!list) {
        list = [];
        postings.set(gram, list);
      }
      list.push(index);
    }
  });

  const index = new Map<string, SimilarityMatch[]>();
  for (const entry of entries) index.set(String(entry.article.id), []);

  const addMatch = (left: number, right: number, similarity: number) => {
    const leftArticle = entries[left].article;
    const rightArticle = entries[right].article;
    const leftList = index.get(String(leftArticle.id));
    const rightList = index.get(String(rightArticle.id));
    leftList?.push({ article: rightArticle, similarity });
    rightList?.push({ article: leftArticle, similarity });
  };

  const seen = new Set<string>();
  for (const docs of postings.values()) {
    if (docs.length < 2) continue;
    for (let p = 0; p < docs.length; p += 1) {
      const i = docs[p];
      for (let q = p + 1; q < docs.length; q += 1) {
        const j = docs[q];
        const pairKey = i < j ? `${i},${j}` : `${j},${i}`;
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        const a = entries[i].parts;
        const b = entries[j].parts;
        if (!a.text || !b.text) continue;
        if (a.text === b.text) {
          addMatch(i, j, 1);
          continue;
        }

        const shorter = a.text.length <= b.text.length ? a : b;
        const longer = shorter === a ? b : a;
        if (shorter.text.length >= 8 && longer.text.includes(shorter.text)) {
          addMatch(i, j, 0.88);
          continue;
        }
        if (Math.min(a.size, b.size) / Math.max(a.size, b.size) < threshold) continue;

        const required = Math.ceil((threshold * (a.size + b.size)) / (1 + threshold));
        const small = a.size <= b.size ? a : b;
        const large = small === a ? b : a;
        let intersection = 0;
        for (const [gram, count] of small.grams) {
          const other = large.grams.get(gram) || 0;
          intersection += Math.min(count, other);
          if (intersection >= required) break;
        }
        if (intersection < required) continue;

        const similarity = partsSimilarity(a, b);
        if (similarity >= threshold) addMatch(i, j, similarity);
      }
    }
  }

  similarityIndexCache.set(key, index);
  if (similarityIndexCache.size > SIMILARITY_INDEX_CACHE_LIMIT) {
    const oldest = similarityIndexCache.keys().next().value;
    if (oldest !== undefined) similarityIndexCache.delete(oldest);
  }
  return index;
}

/** 归一化标题：只保留可用于事件匹配的字词，不把网址和标点当相似信号。 */
export function normalizeHeadline(input: string): string {
  let text = String(input || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
  for (const word of COMMON_TITLE_WORDS) {
    text = text.split(word).join('');
  }
  return text;
}

function bigrams(text: string): Map<string, number> {
  const out = new Map<string, number>();
  if (!text) return out;
  if (text.length === 1) {
    out.set(text, 1);
    return out;
  }
  for (let i = 0; i < text.length - 1; i += 1) {
    const gram = text.slice(i, i + 2);
    out.set(gram, (out.get(gram) || 0) + 1);
  }
  return out;
}

/** 标题事件相似度：字符二元组重合度；包含关系需至少 8 个有效字符。 */
export function headlineSimilarity(a: string, b: string): number {
  const left = normalizeHeadline(a);
  const right = normalizeHeadline(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  if (shorter.length >= 8 && longer.includes(shorter)) return 0.88;

  const am = bigrams(left);
  const bm = bigrams(right);
  let intersection = 0;
  let union = 0;
  for (const [gram, count] of am) {
    const other = bm.get(gram) || 0;
    intersection += Math.min(count, other);
    union += Math.max(count, other);
  }
  for (const [gram, count] of bm) {
    if (!am.has(gram)) union += count;
  }
  return union > 0 ? intersection / union : 0;
}

function publisherKey(article: {
  title?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
}): string {
  return sourceGroupKeyForArticle(article);
}

function isWithinSevenDays(a: NewsArticle, b: NewsArticle): boolean {
  const at = articleSortTime(a);
  const bt = articleSortTime(b);
  if (!at || !bt) return false;
  return Math.abs(at - bt) <= 7 * 24 * 60 * 60 * 1000;
}

/**
 * 真实可追溯性档案。
 *
 * 这里不输出“真假分数”：标题相似只能证明报道可能指向同一事件，不能证明内容为真。
 * AI 生成的 multiSources 也不计入 sources，避免把模型记忆误当成独立新闻来源。
 */
export function buildEvidenceProfile(
  article: NewsArticle,
  corpus: readonly NewsArticle[] = [],
  similarityThreshold = 0.46,
  similarityIndex?: Map<string, SimilarityMatch[]>
): EvidenceProfile {
  let corpusCache = evidenceProfileCache.get(article);
  if (!corpusCache) {
    corpusCache = new WeakMap<object, Map<number, EvidenceProfile>>();
    evidenceProfileCache.set(article, corpusCache);
  }
  let thresholdCache = corpusCache.get(corpus);
  if (!thresholdCache) {
    thresholdCache = new Map<number, EvidenceProfile>();
    corpusCache.set(corpus, thresholdCache);
  }
  const cached = thresholdCache.get(similarityThreshold);
  if (cached) return cached;

  const index = similarityIndex ?? buildSimilarityIndex(corpus, similarityThreshold);
  const indexedMatches = index.get(String(article.id));
  const directMatches = indexedMatches
    ? indexedMatches
        .filter((match) => {
          const candidate = match.article;
          if (candidate.id === article.id) return false;
          if (publisherKey(candidate) === publisherKey(article)) return false;
          return isWithinSevenDays(article, candidate);
        })
        .map((match) => match.article)
    : corpus.filter((candidate) => {
        if (candidate.id === article.id) return false;
        if (publisherKey(candidate) === publisherKey(article)) return false;
        if (!isWithinSevenDays(article, candidate)) return false;
        return headlineSimilarity(article.title, candidate.title) >= similarityThreshold;
      });

  const candidates = [article, ...directMatches];
  const sourceKeys = new Set(
    candidates.flatMap((item) => [
      publisherKey(item),
      ...(item.sourceOccurrences || []).map((occurrence) => publisherKey(occurrence)),
    ]).filter(Boolean)
  );
  const sourceNames = [...new Set(
    candidates.flatMap((item) => [
      item.sourceName,
      ...(item.sourceOccurrences || []).map((occurrence) => occurrence.sourceName),
    ]).filter(Boolean)
  )];
  const occurrenceCount = candidates.reduce(
    (count, item) => count + 1 + (item.sourceOccurrences?.length || 0),
    0
  );
  const hasOriginalLink = Boolean(article.sourceUrl);
  const hasPublishedTime = articleSortTime(article) > 0;
  const aiClaimedSources = Array.isArray(article.rippleEffect?.multiSources)
    ? article.rippleEffect.multiSources.length
    : 0;
  const profile = mediaProfile(article.sourceName, article.sourceUrl);
  const groupInfos = candidates.map((item) => sourceGroupInfo(item.sourceName, item.sourceUrl));

  let status: EvidenceStatus = 'unverified';
  if (sourceKeys.size >= 2) status = 'corroborated';
  else if (profile?.tier === 'A' && hasOriginalLink) status = 'official-single';
  else if (hasOriginalLink) status = 'single-source';

  const title =
    status === 'corroborated'
      ? `${sourceKeys.size} 个独立来源`
      : status === 'official-single'
        ? '官方单源'
        : status === 'single-source'
          ? '单一来源'
          : '来源待核验';

  const note = [
    `独立来源按当前语料中 7 天内、标题事件相似度 ≥ ${Math.round(similarityThreshold * 100)}% 的不同来源集团聚合。`,
    groupInfos.some((group) => !group.known)
      ? '部分来源的母集团未登记，系统只按域名区分，不擅自判为独立或同源。'
      : '',
    hasOriginalLink ? '已附原文链接。' : '缺少原文链接。',
    hasPublishedTime ? '发布时间可解析。' : '缺少可解析发布时间。',
    aiClaimedSources > 0
      ? `另有 ${aiClaimedSources} 条 AI 列出的来源线索；它们不参与独立来源计数，也未经过联网核验。`
      : '',
    '该档案描述可追溯性，不判断报道内容真假。',
  ]
    .filter(Boolean)
    .join(' ');

  const result = {
    status,
    independentSources: Math.max(1, sourceKeys.size),
    sourceNames,
    occurrenceCount,
    corroboratingArticleIds: directMatches.map((item) => item.id),
    hasOriginalLink,
    hasPublishedTime,
    aiClaimedSources,
    title,
    note,
  };
  thresholdCache.set(similarityThreshold, result);
  return result;
}
