// 智能搜索增强：TF-IDF 语义搜索 + 同义词扩展 + 拼音模糊匹配

export interface SearchHit {
  articleId: string;
  score: number;
  highlights: string[];
  reason: string[];
}

export interface SearchQuery {
  query: string;
  filters?: {
    sectors?: string[];
    regions?: string[];
    sources?: string[];
  };
}

// 同义词库
const SYNONYMS: Record<string, string[]> = {
  "人工智能": ["AI", "ai", "人工智能", "智算", "智能计算"],
  "芯片": ["芯片", "半导体", "IC", "集成电路", "cpu", "gpu", "npu"],
  "自动驾驶": ["自动驾驶", "智驾", "autonomous driving", "autonomous"],
  "新能源": ["新能源", "新能源车", "电动车", "EV", "electric vehicle"],
  "云计算": ["云计算", "云服务", "cloud", "SaaS", "PaaS"],
};

// 拼音简写映射
const PINYIN_MAP: Record<string, string> = {
  "nvda": "NVIDIA",
  "nvidia": "NVIDIA",
  "bat": "BAT|百度|阿里|腾讯",
  "baidu": "百度",
  "ali": "阿里|阿里巴巴",
  "alibaba": "阿里巴巴",
  "tencent": "腾讯",
  "huawei": "华为",
  "byd": "比亚迪",
  "王兴": "王兴",
  "雷军": "雷军",
  "张一鸣": "张一鸣",
};

// 停用词（不影响搜索）
const STOP_WORDS = new Set(["的", "了", "在", "是", "和", "与", "或", "及", "对", "向", "到"]);

function tokenize(text: string): string[] {
  // 中文分词（简单按字滑动）
  const chineseTokens: string[] = [];
  const chineseChars = text.replace(/[^一-龥]/g, "");
  for (let i = 0; i < chineseChars.length; i++) {
    for (let j = i + 1; j <= Math.min(i + 4, chineseChars.length); j++) {
      const word = chineseChars.slice(i, j);
      if (word.length >= 2) chineseTokens.push(word);
    }
  }
  
  // 英文分词
  const englishTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  
  return [...chineseTokens, ...englishTokens];
}

function extractKeywords(query: string): string[] {
  const tokens = tokenize(query);
  
  // 扩展同义词
  const expanded: string[] = [];
  for (const token of tokens) {
    let found = false;
    for (const [canonical, variants] of Object.entries(SYNONYMS)) {
      if (variants.some(v => v.toLowerCase() === token.toLowerCase())) {
        expanded.push(...variants);
        found = true;
        break;
      }
    }
    if (!found) expanded.push(token);
  }
  
  // 拼音映射
  for (const token of expanded) {
    const lower = token.toLowerCase();
    if (PINYIN_MAP[lower]) {
      expanded.push(PINYIN_MAP[lower]);
    }
  }
  
  return expanded.filter(w => w.length >= 2);
}

function calculateTF(text: string, keywords: string[]): Record<string, number> {
  const tokens = tokenize(text.toLowerCase());
  const tf: Record<string, number> = {};
  
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    let count = 0;
    
    // 中文匹配
    if (/^[\u4e00-\u9fa5]+$/.test(kwLower)) {
      count = text.toLowerCase().split(kwLower).length - 1;
    } else {
      // 英文匹配
      const words = text.toLowerCase().split(/[^a-z0-9]+/);
      count = words.filter(w => w === kwLower || w.startsWith(kwLower)).length;
    }
    
    if (count > 0) {
      tf[kw] = count / tokens.length;
    }
  }
  
  return tf;
}

function calculateIDF(corpusSize: number, docFrequency: number): number {
  if (docFrequency === 0) return 0;
  return Math.log((corpusSize + 1) / (docFrequency + 1)) + 1;
}

// 文本相似度（Jaccard）
function textSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));
  
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
}

// 标题相似度（Levenshtein 简化版）
function headlineSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  const s1 = title1.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
  const s2 = title2.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // 简单字符匹配
  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s2.includes(s1[i])) matches++;
  }
  
  return matches / Math.max(s1.length, s2.length);
}

export function smartSearch(
  query: string,
  articles: Array<{ id: string; title?: string; summary?: string; tags?: string[]; sector?: string[] }>,
  corpusSize: number = 1000
): SearchHit[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];
  
  return articles
    .map(article => {
      const text = `${article.title || ""} ${article.summary || ""} ${(article.tags || []).join(" ")}`;
      
      // 计算 TF-IDF 得分
      const tf = calculateTF(text, keywords);
      let score = 0;
      const reasons: string[] = [];
      const highlights: string[] = [];
      
      for (const [kw, tfValue] of Object.entries(tf)) {
        const docFreq = articles.filter(a => 
          (a.title || "").toLowerCase().includes(kw.toLowerCase()) ||
          (a.summary || "").toLowerCase().includes(kw.toLowerCase())
        ).length;
        const idf = calculateIDF(corpusSize, docFreq);
        const tfidf = tfValue * idf;
        score += tfidf;
        
        if (tfidf > 0.01) {
          reasons.push(`${kw} (TF-IDF: ${Math.round(tfidf * 1000) / 10})`);
          // 提取高亮片段
          const idx = text.toLowerCase().indexOf(kw.toLowerCase());
          if (idx >= 0) {
            const start = Math.max(0, idx - 20);
            const end = Math.min(text.length, idx + kw.length + 20);
            const snippet = text.slice(start, end);
            highlights.push(snippet);
          }
        }
      }
      
      // 标题加权
      if (article.title && keywords.some(kw => 
        article.title!.toLowerCase().includes(kw.toLowerCase())
      )) {
        score *= 1.5;
        reasons.push("标题匹配");
      }
      
      // 同义词扩展匹配
      for (const [canonical, variants] of Object.entries(SYNONYMS)) {
        if (keywords.includes(canonical)) {
          for (const v of variants) {
            if (article.title?.toLowerCase().includes(v.toLowerCase())) {
              score += 0.1;
              reasons.push(`同义词: ${canonical} ≈ ${v}`);
            }
          }
        }
      }
      
      // 文本相似度
      const sim = textSimilarity(query, text);
      if (sim > 0.1) {
        score += sim * 0.5;
      }
      
      return {
        articleId: article.id,
        score: Math.round(score * 1000) / 1000,
        highlights: Array.from(new Set(highlights)).slice(0, 3),
        reason: reasons.slice(0, 5),
      };
    })
    .filter(hit => hit.score > 0.05)
    .sort((a, b) => b.score - a.score);
}

export function fuzzyMatch(query: string, candidates: string[]): { candidate: string; score: number }[] {
  const qLower = query.toLowerCase();
  return candidates
    .map(c => {
      const cLower = c.toLowerCase();
      let score = 0;
      
      // 完全匹配
      if (qLower === cLower) score = 1;
      // 包含匹配
      else if (cLower.includes(qLower)) score = 0.8;
      // 首字母匹配
      else if (c.split(/\s+/)[0]?.toLowerCase().startsWith(qLower)) score = 0.6;
      // 汉字匹配
      else if (/^[\u4e00-\u9fa5]+$/.test(qLower) && c.includes(query)) score = 0.7;
      
      return { candidate: c, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export const SearchUtils = {
  extractKeywords,
  calculateTF,
  textSimilarity,
  headlineSimilarity,
  smartSearch,
  fuzzyMatch,
};
