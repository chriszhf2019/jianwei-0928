import type { LogicTreeData, NewsArticle, PersonaImpactItem, RippleEffectData } from "../types";

function clean(value: string | undefined): string {
  return (value || "").trim().replace(/\s+/g, " ");
}

function clip(value: string | undefined, max = 120): string {
  const text = clean(value);
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

/** 七要素：用一句大白话讲清楚“发生了什么 + 最关键的影响是什么”。 */
export function sevenElementsPlain(article: NewsArticle): string {
  const se = article.sevenElements;
  if (!se) return "";
  const what = clip(se.what, 140);
  const soWhat = clip(se.soWhat, 140);
  if (!what && !soWhat) return "";
  const lead = what ? `这件事简单说：${what}` : "这件事";
  const tail = soWhat ? `；最关键的影响是：${soWhat}` : "";
  return `${lead}${tail}。`;
}

/** 因果链：用一句大白话讲清根因、传导到哪，并强调这是推演不是事实。 */
export function logicTreePlain(tree: LogicTreeData): string {
  const root = clip(tree.rootCause, 120);
  const labels = (tree.nodes || []).map((node) => clean(node.label)).filter(Boolean);
  const end = labels.length > 0 ? labels[labels.length - 1] : "";
  if (!root && !end) return "";
  const lead = root ? `事情的根子是「${root}」` : "事情从一条主线出发";
  const chain = end ? `，再一步步传导到「${end}」` : "";
  return `${lead}${chain}；这是推演，不是已经发生的事实。`;
}

/** 涟漪效应：用一句大白话讲清“先影响谁、再波及谁、长远可能改变什么”。 */
export function ripplePlain(ripple: RippleEffectData): string {
  const titles = (ripple.stages || []).map((stage) => clean(stage.title)).filter(Boolean);
  if (titles.length === 0) return "";
  let text = `简单说：这件事先影响「${titles[0]}」`;
  if (titles[1]) text += `，接着波及「${titles[1]}」`;
  if (titles[2]) text += `，长远可能重塑「${titles[2]}」`;
  return `${text}；具体会不会这样，要看触发条件是否出现。`;
}

/** 与我何干：用一句大白话把某个身份的直接变化、机会和风险串起来。 */
export function personaPlain(item: PersonaImpactItem | undefined, personaName?: string): string {
  if (!item) return "";
  const who = clean(personaName) || "你";
  const impact = clip(item.coreImpact, 140);
  const opportunity = clip(item.opportunity, 120);
  const threatRisk = clip(item.threatRisk, 120);
  const parts: string[] = [];
  if (impact) parts.push(`对「${who}」来说，最直接的变化是：${impact}`);
  if (opportunity) parts.push(`可以留意：${opportunity}`);
  if (threatRisk) parts.push(`需要小心：${threatRisk}`);
  if (parts.length === 0) return "";
  return `${parts.join("；")}；这些是条件推演，不是定论。`;
}
