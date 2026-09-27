export type SourceCategory = 'tech' | 'finance' | 'other';

export interface CuratedSource {
  id: string;
  name: string;
  homepage: string;
  /** 可被现有 RSS 摄取器直接读取的地址；没有公开 RSS 的站点不提供。 */
  feed?: string;
  category: SourceCategory;
  language: '英文' | '中文' | '双语';
  region?: string;
  strength: string;
  note?: string;
}

export const SOURCE_CATEGORY_META: Record<
  SourceCategory,
  { label: string; description: string }
> = {
  tech: {
    label: '科技',
    description: '前沿技术、初创公司、产品发布与行业一手动态。',
  },
  finance: {
    label: '财经',
    description: '宏观、市场、公司与金融监管的权威来源。',
  },
  other: {
    label: '其他',
    description: '综合新闻、科学、能源与全球治理等补充来源。',
  },
};

export const CURATED_SOURCES: CuratedSource[] = [
  // 科技：海外英文原版平台优先，中文双语平台作为落地补充。
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    homepage: 'https://techcrunch.com/',
    feed: 'https://techcrunch.com/feed/',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: '全球初创企业、VC 融资与硅谷商业动态，适合公司拆解和一级市场跟踪。',
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    homepage: 'https://www.theverge.com/',
    feed: 'https://www.theverge.com/rss/index.xml',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: '消费电子、手机、AI 产品与科技文化，新闻加评测，可读性强。',
  },
  {
    id: 'mit-tech-review',
    name: 'MIT Technology Review',
    homepage: 'https://www.technologyreview.com/',
    feed: 'https://www.technologyreview.com/feed/',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: '前沿技术能否落地的长期判断，覆盖 AI、生物医药、半导体与新能源。',
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    homepage: 'https://arstechnica.com/',
    feed: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: '硬核技术细节，芯片、操作系统、网络、科学与政策，工程师视角。',
  },
  {
    id: 'hacker-news',
    name: 'Hacker News',
    homepage: 'https://news.ycombinator.com/',
    feed: 'https://hnrss.org/frontpage',
    category: 'tech',
    language: '英文',
    region: '全球',
    strength: 'YC 社区聚合全球科技文章，能挖到主流媒体漏掉的一手博客与行业爆料。',
    note: 'RSS 由 HNRSS 社区镜像提供，非 YC 官方接口。',
  },
  {
    id: 'the-information',
    name: 'The Information',
    homepage: 'https://www.theinformation.com/',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: '硅谷内部独家爆料，互联网大厂商业、战略与人事，订阅制深度内容。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'wired',
    name: 'Wired',
    homepage: 'https://www.wired.com/',
    feed: 'https://www.wired.com/feed/rss',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: '科技如何影响社会与文化的长篇专题，适合长读思考。',
  },
  {
    id: 'venturebeat',
    name: 'VentureBeat',
    homepage: 'https://venturebeat.com/',
    feed: 'https://venturebeat.com/feed/',
    category: 'tech',
    language: '英文',
    region: '美国',
    strength: 'AI 与创业生态的产业报道，补充硅谷一手融资和产品信号。',
  },
  {
    id: 'technode',
    name: '动点科技 Technode',
    homepage: 'https://technode.com/',
    feed: 'https://technode.com/feed/',
    category: 'tech',
    language: '双语',
    region: '中国/全球',
    strength: '中英双语，全球初创与中国出海科技，兼顾海外和国内视角。',
  },
  {
    id: 'ithome',
    name: 'IT 之家',
    homepage: 'https://www.ithome.com/',
    feed: 'https://www.ithome.com/rss/',
    category: 'tech',
    language: '中文',
    region: '中国',
    strength: '全球数码硬件快讯与新品发布会，国内更新速度快。',
  },
  {
    id: '36kr',
    name: '36氪',
    homepage: 'https://36kr.com/',
    category: 'tech',
    language: '中文',
    region: '中国',
    strength: '中国创业、科技公司与一级市场动态，中文科技商业权威来源。',
    note: '官网 RSS 现返回 HTML 拦截页，无稳定公开 RSS；可手动保存文章。',
  },

  // 财经：权威英文与中文头部财经来源的先行清单，后续可按同等口径继续补充。
  {
    id: 'financial-times',
    name: 'Financial Times',
    homepage: 'https://www.ft.com/',
    feed: 'https://www.ft.com/rss/home',
    category: 'finance',
    language: '英文',
    region: '全球',
    strength: '全球宏观、市场与公司治理权威报道，部分内容付费。',
    note: '付费墙可能影响 RSS 正文抓取。',
  },
  {
    id: 'wsj',
    name: 'The Wall Street Journal',
    homepage: 'https://www.wsj.com/',
    category: 'finance',
    language: '英文',
    region: '美国',
    strength: '全球市场与商业政策，深度财经分析。',
    note: '旧 Dow Jones 公开 RSS 已停更，现无可用公开 RSS；可手动保存官网文章。',
  },
  {
    id: 'reuters',
    name: 'Reuters',
    homepage: 'https://www.reuters.com/',
    category: 'finance',
    language: '英文',
    region: '全球',
    strength: '全球商业与市场一手快讯，适合做事实基线。',
    note: '旧 feeds.reuters.com 已停用，现无公开 RSS；可手动保存官网文章。',
  },
  {
    id: 'caixin-global',
    name: 'Caixin Global',
    homepage: 'https://www.caixinglobal.com/',
    category: 'finance',
    language: '双语',
    region: '中国',
    strength: '中国经济、金融与政策深度调查，中英双语。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'caixin',
    name: '财新',
    homepage: 'https://www.caixin.com/',
    category: 'finance',
    language: '中文',
    region: '中国',
    strength: '中国宏观、金融与公共政策深度报道。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'the-economist',
    name: 'The Economist 经济学人',
    homepage: 'https://www.economist.com/',
    feed: 'https://www.economist.com/finance-and-economics/rss.xml',
    category: 'finance',
    language: '英文',
    region: '全球',
    strength: '全球宏观、市场与政治经济权威分析，观点鲜明、深度报道。',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg 彭博',
    homepage: 'https://www.bloomberg.com/',
    category: 'finance',
    language: '英文',
    region: '全球',
    strength: '全球市场、公司与金融一手终端资讯，机构级覆盖。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'wallstreetcn',
    name: '华尔街见闻',
    homepage: 'https://wallstreetcn.com/',
    category: 'finance',
    language: '中文',
    region: '中国',
    strength: '全球市场与宏观快讯的中文解读，更新速度快。',
    note: '无稳定公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'jiemian',
    name: '界面新闻',
    homepage: 'https://www.jiemian.com/',
    feed: 'https://a.jiemian.com/index.php?m=article&a=rss',
    category: 'finance',
    language: '中文',
    region: '中国',
    strength: '中国商业、公司与财经深度报道，中文权威商业来源。',
  },
  {
    id: 'cnbc',
    name: 'CNBC',
    homepage: 'https://www.cnbc.com/',
    feed: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    category: 'finance',
    language: '英文',
    region: '美国',
    strength: '全球市场、公司与经济快讯，美股交易时段更新密集。',
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch',
    homepage: 'https://www.marketwatch.com/',
    feed: 'https://feeds.marketwatch.com/marketwatch/topstories/',
    category: 'finance',
    language: '英文',
    region: '美国',
    strength: '市场行情、个人理财与公司新闻，覆盖美股与宏观经济。',
  },

  // 其他：综合、科学与全球治理补充来源。
  {
    id: 'bbc',
    name: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    feed: 'https://feeds.bbci.co.uk/news/rss.xml',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '全球综合新闻基线，适合跨区域事件比对。',
  },
  {
    id: 'the-guardian',
    name: 'The Guardian',
    homepage: 'https://www.theguardian.com/',
    feed: 'https://www.theguardian.com/world/rss',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '国际新闻与深度调查，长文和专栏质量稳定。',
  },
  {
    id: 'nature',
    name: 'Nature',
    homepage: 'https://www.nature.com/',
    feed: 'https://www.nature.com/nature.rss',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '自然科学与前沿研究，适合科技与产业交叉议题。',
  },
  {
    id: 'science',
    name: 'Science',
    homepage: 'https://www.science.org/',
    feed: 'https://www.science.org/rss/news_current.xml',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '国际科学新闻与政策，权威性高。',
  },
  {
    id: 'ap-news',
    name: 'AP News 美联社',
    homepage: 'https://apnews.com/',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '全球通讯社事实基线，突发与跨国事件权威来源。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'npr',
    name: 'NPR 美国国家公共电台',
    homepage: 'https://www.npr.org/',
    feed: 'https://feeds.npr.org/1001/rss.xml',
    category: 'other',
    language: '英文',
    region: '美国/全球',
    strength: '美国公共媒体，全球新闻与深度报道，公信力高。',
  },
  {
    id: 'afp',
    name: 'AFP 法新社',
    homepage: 'https://www.afp.com/en',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '全球通讯社事实基线，突发与跨国事件权威快讯。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'al-jazeera',
    name: 'Al Jazeera 半岛电视台',
    homepage: 'https://www.aljazeera.com/',
    feed: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'other',
    language: '英文',
    region: '全球',
    strength: '全球与中东视角的国际新闻，适合做跨区域事件比对。',
  },
  {
    id: 'politico',
    name: 'Politico',
    homepage: 'https://www.politico.com/',
    feed: 'https://www.politico.com/rss/politicopicks.xml',
    category: 'other',
    language: '英文',
    region: '美国/欧盟',
    strength: '美国与欧盟政治政策一手报道，全球治理与监管议题权威。',
  },
  {
    id: 'scmp',
    name: 'South China Morning Post 南华早报',
    homepage: 'https://www.scmp.com/',
    category: 'other',
    language: '英文',
    region: '中国/亚洲',
    strength: '中国与亚洲事务的英文权威报道，补充海外视角。',
    note: '无稳定公开 RSS，可手动保存官网文章。',
  },
  {
    id: 'xinhua',
    name: '新华网',
    homepage: 'https://www.news.cn/',
    category: 'other',
    language: '中文',
    region: '中国',
    strength: '国家通讯社官方来源，政策与要闻权威基线。',
    note: '无公开 RSS，可手动保存官网文章。',
  },
];

/** 把信源分类映射为中文展示名（科技 / 财经 / 其他）。 */
export function sourceCategoryLabel(category: SourceCategory): string {
  return SOURCE_CATEGORY_META[category].label;
}

function sourceHost(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  // 裸域名（无协议、无路径）直接按主机名处理；完整链接则走 URL 解析。
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes('/')) {
    return trimmed.replace(/^www\./, '').toLowerCase();
  }
  try {
    return new URL(trimmed).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return trimmed.replace(/^www\./, '').toLowerCase();
  }
}

const FEED_HOST_INDEX = new Map<string, CuratedSource>();
const HOME_HOST_INDEX = new Map<string, CuratedSource>();
for (const source of CURATED_SOURCES) {
  if (source.feed) {
    const host = sourceHost(source.feed);
    if (host && !FEED_HOST_INDEX.has(host)) FEED_HOST_INDEX.set(host, source);
  }
  const host = sourceHost(source.homepage);
  if (host && !HOME_HOST_INDEX.has(host)) HOME_HOST_INDEX.set(host, source);
}

/** 根据 RSS Feed 地址反查已收录信源（用于摄取时给条目打来源标记）。 */
export function curatedSourceByFeedUrl(feedUrl?: string | null): CuratedSource | null {
  if (!feedUrl) return null;
  const host = sourceHost(feedUrl);
  if (!host) return null;
  return FEED_HOST_INDEX.get(host) ?? null;
}

/** 根据域名/文章链接反查已收录信源（Feed 反查失败时的兜底）。 */
export function curatedSourceByDomain(hostOrUrl?: string | null): CuratedSource | null {
  if (!hostOrUrl) return null;
  const host = sourceHost(hostOrUrl);
  if (!host) return null;
  return FEED_HOST_INDEX.get(host) ?? HOME_HOST_INDEX.get(host) ?? null;
}
