import { mediaKey } from './mediaAuthority';

export interface SourceGroupInfo {
  key: string;
  label: string;
  known: boolean;
  basis: 'known_group' | 'domain_only' | 'syndication';
}

/**
 * 只登记能够明确确认归属关系的域名组。
 * 未登记来源按各自域名分开，不推断母集团，也不把“未知”当作同一来源。
 */
const KNOWN_GROUPS: Array<{ id: string; label: string; domains: string[] }> = [
  {
    id: 'group-people-daily-online',
    label: '人民网系',
    domains: ['people.com.cn'],
  },
  {
    id: 'group-xinhua',
    label: '新华社系',
    domains: ['xinhuanet.com', 'news.cn'],
  },
  {
    id: 'group-cctv',
    label: '中央广播电视总台系',
    domains: ['cctv.com', 'cctv.cn'],
  },
  {
    id: 'group-guangming',
    label: '光明日报系',
    domains: ['gmw.cn'],
  },
];

/** 通讯社/官方稿件的显式转载归因标记：只在标题/导语出现“来源：新华社”等明确字样时才归到原发集团。 */
const SYNDICATION_AGENCIES: Array<{ id: string; label: string; names: string[] }> = [
  { id: 'group-xinhua', label: '新华社系', names: ['新华社', '新华网'] },
  { id: 'group-people-daily-online', label: '人民网系', names: ['人民网', '人民日报'] },
  { id: 'group-cctv', label: '中央广播电视总台系', names: ['央视', '中央电视台'] },
  { id: 'group-guangming', label: '光明日报系', names: ['光明网', '光明日报'] },
];

function hostname(sourceName?: string | null, sourceUrl?: string | null): string {
  return mediaKey(sourceName, sourceUrl).toLowerCase().replace(/^www\./, '');
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function sourceGroupInfo(
  sourceName?: string | null,
  sourceUrl?: string | null
): SourceGroupInfo {
  const host = hostname(sourceName, sourceUrl);
  if (!host) {
    return { key: 'unknown-source', label: '来源未知', known: false, basis: 'domain_only' };
  }
  const matched = KNOWN_GROUPS.find((group) =>
    group.domains.some((domain) => matchesDomain(host, domain))
  );
  if (matched) {
    return { key: matched.id, label: matched.label, known: true, basis: 'known_group' };
  }
  return { key: `domain:${host}`, label: host, known: false, basis: 'domain_only' };
}

export function sourceGroupKey(
  sourceName?: string | null,
  sourceUrl?: string | null
): string {
  return sourceGroupInfo(sourceName, sourceUrl).key;
}

/** 从标题/导语识别“转载自某通讯社/官媒”的显式归因；无明确标记返回 null，不臆断。 */
export function inferSyndicationGroup(text?: string | null): SourceGroupInfo | null {
  const t = String(text || '');
  if (!t) return null;
  for (const agency of SYNDICATION_AGENCIES) {
    for (const name of agency.names) {
      if (
        t.includes(`来源：${name}`) ||
        t.includes(`来源:${name}`) ||
        t.includes(`据${name}`) ||
        t.includes(`转自${name}`) ||
        t.startsWith(`${name}：`) ||
        t.startsWith(`${name}:`)
      ) {
        return { key: agency.id, label: agency.label, known: true, basis: 'syndication' };
      }
    }
  }
  return null;
}

/** 供“多源印证”使用：先看是否转载归因，再退回域名/集团口径，避免同稿被转载算成多个独立来源。 */
export function sourceGroupKeyForArticle(article: {
  title?: string | null;
  summary?: string | null;
  subtitle?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
}): string {
  const syndicated = inferSyndicationGroup(`${article.title || ''} ${article.subtitle || ''} ${article.summary || ''}`);
  if (syndicated) return syndicated.key;
  return sourceGroupKey(article.sourceName, article.sourceUrl);
}
