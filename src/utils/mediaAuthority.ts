// 媒体权威度档案：按“域名”人工维护的信源档案（可复核、不伪装自动评分）。
// 分级口径：
//   A = 官方媒体/权威通讯社（如人民网、新华社系）—— 事实核查严格、信息一手性强
//   B = 行业/主流商业媒体（如 IT之家、钛媒体、财联社系）—— 专业垂直、引用率较高
//   C = 泛科技/消费媒体与聚合（如爱范儿、自媒体）—— 有观点性，建议交叉印证
// 未知来源一律标注“未收录”，绝不虚标。
// 词表新增来源时在此登记（displayName 供卡片展示、profile 供悬停说明）。

export interface MediaProfile {
  /** 展示名（域名或媒体名） */
  displayName: string;
  /** 媒体类型 */
  type: string;
  /** 权威档位 A/B/C/null（null=未收录） */
  tier: 'A' | 'B' | 'C' | null;
  /** 一句话档案（悬停展示） */
  profile: string;
}

/** 把 sourceName / 域名归一化为档案键（去掉 www. 与常见后缀，保留主干） */
export function mediaKey(sourceName?: string | null, sourceUrl?: string | null): string {
  const raw = String(sourceName || sourceUrl || '').trim().toLowerCase();
  // 优先取 URL 主机名
  let host = '';
  try {
    if (sourceUrl) host = new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    /* ignore */
  }
  if (!host && raw) {
    // sourceName 形如 politics.people.com.cn → 取注册域主干 people.com.cn
    const m = raw.match(/([a-z0-9-]+\.(?:com|cn|net|org|gov|info|io|co)(?:\.[a-z]{2})?)$/);
    host = m ? m[1] : raw;
  }
  return host.replace(/^www\./, '');
}

const MEDIA_TABLE: Record<string, MediaProfile> = {
  'people.com.cn': { displayName: '人民网', type: '官方媒体', tier: 'A', profile: '人民日报社主办的国家重点新闻网站，官方权威来源，事实核查严格。' },
  'politics.people.com.cn': { displayName: '人民网·时政', type: '官方媒体', tier: 'A', profile: '人民网时政频道，官方权威来源。' },
  'world.people.com.cn': { displayName: '人民网·国际', type: '官方媒体', tier: 'A', profile: '人民网国际频道，官方权威来源。' },
  'finance.people.com.cn': { displayName: '人民网·财经', type: '官方媒体', tier: 'A', profile: '人民网财经频道，官方权威来源。' },
  'ithome.com': { displayName: 'IT之家', type: '科技媒体', tier: 'B', profile: '知名科技垂直媒体，硬件/数码资讯更新快、引用较广。' },
  'tmtpost.com': { displayName: '钛媒体', type: '财经科技媒体', tier: 'B', profile: '财经与科技创投深度媒体，行业分析较专业。' },
  'ifanr.com': { displayName: '爱范儿', type: '消费科技媒体', tier: 'C', profile: '泛科技/消费数码媒体，观点性强，建议交叉印证。' },
  'xinhuanet.com': { displayName: '新华网', type: '官方媒体', tier: 'A', profile: '新华社主办，国家通讯社官方来源。' },
  'news.cn': { displayName: '新华网', type: '官方媒体', tier: 'A', profile: '新华社主办，国家通讯社官方来源。' },
  'cctv.com': { displayName: '央视网', type: '官方媒体', tier: 'A', profile: '中央广播电视总台官方来源。' },
  'gmw.cn': { displayName: '光明网', type: '官方媒体', tier: 'A', profile: '光明日报社主办，官方来源。' },
  'caixin.com': { displayName: '财新', type: '财经媒体', tier: 'B', profile: '专业财经媒体，深度报道有口碑。' },
  'yicai.com': { displayName: '第一财经', type: '财经媒体', tier: 'B', profile: '主流财经媒体（SMG/央视系）。' },
  'cls.cn': { displayName: '财联社', type: '财经媒体', tier: 'B', profile: '财经快讯媒体，电报速度快。' },
  '36kr.com': { displayName: '36氪', type: '创投媒体', tier: 'C', profile: '创投与科技资讯媒体，观点性较强。' },
  'thepaper.cn': { displayName: '澎湃新闻', type: '主流媒体', tier: 'B', profile: '上海报业集团旗下主流新媒体。' },
  'reuters.com': { displayName: 'Reuters 路透社', type: '国际通讯社', tier: 'A', profile: '全球商业与市场一手快讯，事实基线来源。' },
  'ft.com': { displayName: 'Financial Times 金融时报', type: '国际财经媒体', tier: 'A', profile: '全球宏观、市场与公司治理权威报道。' },
  'wsj.com': { displayName: 'The Wall Street Journal 华尔街日报', type: '国际财经媒体', tier: 'A', profile: '全球市场与商业政策深度财经分析。' },
  'bbc.com': { displayName: 'BBC News', type: '国际公共媒体', tier: 'A', profile: '全球综合新闻基线，适合跨区域事件比对。' },
  'bbc.co.uk': { displayName: 'BBC News', type: '国际公共媒体', tier: 'A', profile: '全球综合新闻基线，适合跨区域事件比对。' },
  'theguardian.com': { displayName: 'The Guardian 卫报', type: '国际媒体', tier: 'A', profile: '国际新闻与深度调查，长文和专栏质量稳定。' },
  'nature.com': { displayName: 'Nature', type: '科学期刊', tier: 'A', profile: '自然科学与前沿研究，权威性高。' },
  'science.org': { displayName: 'Science', type: '科学期刊', tier: 'A', profile: '国际科学新闻与政策，权威性高。' },
  'technologyreview.com': { displayName: 'MIT Technology Review', type: '科技评论媒体', tier: 'A', profile: '前沿技术能否落地的长期判断，权威性最高。' },
  'techcrunch.com': { displayName: 'TechCrunch', type: '科技创投媒体', tier: 'B', profile: '全球初创企业、VC 融资与硅谷商业动态。' },
  'theverge.com': { displayName: 'The Verge', type: '科技媒体', tier: 'B', profile: '消费电子、AI 产品与科技文化，新闻加评测。' },
  'arstechnica.com': { displayName: 'Ars Technica', type: '科技媒体', tier: 'B', profile: '硬核技术细节，芯片、操作系统与政策。' },
  'wired.com': { displayName: 'Wired', type: '科技媒体', tier: 'B', profile: '科技如何影响社会与文化的长篇专题。' },
  'venturebeat.com': { displayName: 'VentureBeat', type: '科技创投媒体', tier: 'B', profile: 'AI 与创业生态的产业报道。' },
  'technode.com': { displayName: '动点科技 Technode', type: '科技媒体', tier: 'B', profile: '中英双语，全球初创与中国出海科技。' },
  'caixinglobal.com': { displayName: 'Caixin Global', type: '财经媒体', tier: 'B', profile: '中国经济、金融与政策深度调查，中英双语。' },
  'theinformation.com': { displayName: 'The Information', type: '科技商业媒体', tier: 'A', profile: '硅谷内部独家爆料，互联网大厂商业、战略与人事，订阅制深度内容。' },
  'news.ycombinator.com': { displayName: 'Hacker News', type: '科技社区', tier: 'C', profile: 'YC 程序员社区，网友投票聚合全球科技文章，观点性较强。' },
  'hnrss.org': { displayName: 'Hacker News', type: '科技社区', tier: 'C', profile: 'Hacker News 的 RSS 镜像，内容来自 YC 社区投票。' },
  'economist.com': { displayName: 'The Economist 经济学人', type: '国际财经媒体', tier: 'A', profile: '全球宏观、市场与政治经济权威分析。' },
  'bloomberg.com': { displayName: 'Bloomberg 彭博', type: '国际财经媒体', tier: 'A', profile: '全球市场、公司与金融一手资讯，机构级覆盖。' },
  'wallstreetcn.com': { displayName: '华尔街见闻', type: '财经媒体', tier: 'B', profile: '全球市场与宏观快讯的中文解读。' },
  'apnews.com': { displayName: 'AP News 美联社', type: '国际通讯社', tier: 'A', profile: '全球通讯社事实基线，突发与跨国事件权威来源。' },
  'npr.org': { displayName: 'NPR 美国国家公共电台', type: '国际公共媒体', tier: 'A', profile: '美国公共媒体，全球新闻与深度报道。' },
  'cnbc.com': { displayName: 'CNBC', type: '国际财经媒体', tier: 'A', profile: '全球市场、公司与经济快讯，美股交易时段更新密集。' },
  'marketwatch.com': { displayName: 'MarketWatch', type: '国际财经媒体', tier: 'B', profile: '市场行情、个人理财与公司新闻。' },
};

/** 查媒体档案（未收录返回 null，调用方标注“未收录”） */
export function mediaProfile(sourceName?: string | null, sourceUrl?: string | null): MediaProfile | null {
  const key = mediaKey(sourceName, sourceUrl);
  if (!key) return null;
  return MEDIA_TABLE[key] || null;
}

/** 档位徽标文案与颜色类 */
export function tierBadge(tier: MediaProfile['tier']): { label: string; cls: string; title: string } | null {
  if (tier === 'A') return { label: '官方 · A', cls: 'text-emerald-800 bg-emerald-50 border-emerald-300', title: '官方/权威媒体（一级可信）' };
  if (tier === 'B') return { label: '行业 · B', cls: 'text-[#0284C7] bg-sky-50 border-sky-300', title: '行业/主流商业媒体（二级可信）' };
  if (tier === 'C') return { label: '消费 · C', cls: 'text-stone-500 bg-stone-50 border-stone-300', title: '泛科技/观点媒体（建议交叉印证）' };
  return null;
}
