import type { NewsArticle, RadarKeyword, UserPersona } from "../types";
import { monitorHits } from "./monitorKeywords";
import { matchesNewsInterestGroups } from "./sectorTaxonomy";

export interface RelevanceContext {
  persona: UserPersona;
  interestGroups: string[];
  radarKeywords: RadarKeyword[];
  followedTags: string[];
  bookmarkedIds: string[];
}

export interface RelevanceMeta {
  score: number;
  reasons: string[];
}

/** 个人相关性：命中身份、监控词、兴趣领域、关注标签与收藏，逐项加分并给出理由。 */
export function relevanceMeta(article: NewsArticle, ctx: RelevanceContext): RelevanceMeta {
  let score = 0;
  const reasons: string[] = [];

  const personaHit = (article.personaImpacts || []).some((p) => p.personaId === ctx.persona.id);
  if (personaHit) {
    score += 35;
    reasons.push(`命中「${ctx.persona.name}」身份`);
  }

  const monitor = monitorHits(article, ctx.radarKeywords);
  if (monitor.length > 0) {
    score += 25;
    reasons.push(`监控词命中 ${monitor.length} 个`);
  }

  if (matchesNewsInterestGroups(article, ctx.interestGroups)) {
    score += 20;
    reasons.push("在我的兴趣领域");
  }

  const fields = [article.category, ...(article.tags || [])]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const followed = ctx.followedTags.filter((tag) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) return false;
    return fields.some(
      (field) => field === normalized || field.includes(normalized) || normalized.includes(field)
    );
  });
  if (followed.length > 0) {
    score += 15;
    reasons.push(`关注标签命中 ${followed.length} 个`);
  }

  if (ctx.bookmarkedIds.includes(article.id)) {
    score += 5;
    reasons.push("已收藏");
  }

  return { score: Math.min(100, score), reasons };
}
