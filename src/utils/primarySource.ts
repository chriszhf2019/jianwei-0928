// 一手/官方来源识别：把“主体自述/官方公告/监管文件”与“媒体转载报道”区分开。
// 这是可复核的人工登记口径，不是模型推断；清单可继续扩充，但绝不把未登记域名虚标成官方。

export type PrimarySourceKind = 'government' | 'institution' | 'first_party';

/** 政府/军事/教育机构后缀：gov、gov.cn、mil、edu 等。 */
const GOVERNMENT_HOST = /(^|\.)(gov(\.[a-z]{2,3})?|mil|edu)(\.|$)/i;

/** 监管机构、央行、交易所等官方机构（不含媒体）。 */
const INSTITUTION_HOSTS = new Set([
  'sec.gov',
  'federalreserve.gov',
  'ecb.europa.eu',
  'imf.org',
  'worldbank.org',
  'wto.org',
  'csrc.gov.cn',
  'pbc.gov.cn',
  'sse.com.cn',
  'szse.cn',
  'hkex.com.hk',
]);

/** 科技/商业公司的一手新闻室或官方博客：主体自述口径，仍需与其他来源交叉印证。 */
const FIRST_PARTY_HOSTS = new Set([
  'blog.google',
  'about.google',
  'deepmind.google',
  'about.fb.com',
  'meta.com',
  'news.microsoft.com',
  'blogs.microsoft.com',
  'devblogs.microsoft.com',
  'microsoft.com',
  'apple.com',
  'openai.com',
  'anthropic.com',
  'blogs.nvidia.com',
  'nvidia.com',
  'qualcomm.com',
  'amd.com',
  'intel.com',
  'tesla.com',
  'aboutamazon.com',
  'samsung.com',
  'huawei.com',
  'xiaomi.com',
  'tencent.com',
  'alibabagroup.com',
  'bytedance.com',
]);

function hostname(sourceName?: string | null, sourceUrl?: string | null): string {
  const raw = String(sourceUrl || sourceName || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    /* fall through to sourceName normalization */
  }
  if (!sourceUrl && sourceName) {
    // sourceName 形如 blog.google / meta.com 时直接当域名；带 www. 前缀则去掉。
    return raw.replace(/^www\./, '').split('/')[0];
  }
  return raw.replace(/^www\./, '').replace(/^https?:\/\//i, '').split('/')[0];
}

function matches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** 识别一手/官方来源；普通媒体与未知来源返回 null。 */
export function primarySourceKind(sourceName?: string | null, sourceUrl?: string | null): PrimarySourceKind | null {
  const host = hostname(sourceName, sourceUrl);
  if (!host) return null;
  if (GOVERNMENT_HOST.test(host)) return 'government';
  if ([...INSTITUTION_HOSTS].some((domain) => matches(host, domain))) return 'institution';
  if ([...FIRST_PARTY_HOSTS].some((domain) => matches(host, domain))) return 'first_party';
  return null;
}

export function primarySourceLabel(kind: PrimarySourceKind): string {
  if (kind === 'government') return '政府/官方一手';
  if (kind === 'institution') return '监管机构一手';
  return '公司官方一手';
}
