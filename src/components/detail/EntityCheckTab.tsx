import React, { useState } from 'react';
import { EntityCheck, NewsArticle } from '../../types';
import { KeyTermHighlight } from '../common/KeyTermHighlight';
import type { NewsSkill } from '../home/HomeView';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Loader2,
  MessageSquareQuote,
  SearchCheck,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface EntityCheckTabProps {
  article: NewsArticle;
  onRunSkill?: (skill: NewsSkill, article: NewsArticle) => Promise<NewsArticle | null>;
}

function statusBadge(status: EntityCheck['responseStatus']): { text: string; cls: string } {
  if (status === '有公开回应') return { text: '有公开回应', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  if (status === '未见公开回应') return { text: '未见公开回应', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
  return { text: '待核验', cls: 'bg-stone-100 text-stone-500 border-stone-300' };
}

export const EntityCheckTab: React.FC<EntityCheckTabProps> = ({ article, onRunSkill }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [inspecting, setInspecting] = useState('');
  const [inspectResult, setInspectResult] = useState<Record<string, { status: string; label: string }>>({});

  const checks = article.entityChecks || [];

  const generate = async () => {
    if (!onRunSkill || busy) return;
    setBusy(true);
    setErr('');
    try {
      const updated = await onRunSkill('entitycheck', article);
      if (!updated) setErr('生成失败：可能未配置 AI Key，或服务暂不可用。');
    } finally {
      setBusy(false);
    }
  };

  const inspectSource = async (item: EntityCheck) => {
    if (!item.responseUrl || inspecting) return;
    setInspecting(item.entityName);
    setInspectResult((prev) => ({ ...prev, [item.entityName]: { status: 'loading', label: '正在核验…' } }));
    try {
      const res = await fetch('/api/source/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.responseUrl, quote: item.responseQuote || '' }),
      });
      const json = await res.json();
      const label =
        json.status === 'verified_quote'
          ? '引句已在页面正文中匹配'
          : json.status === 'reachable_unverified'
            ? '链接可访问，但未核验引句'
            : json.status === 'quote_not_found'
              ? '页面可访问，未找到该引句'
              : json.error || json.reason || json.status || '核验未完成';
      setInspectResult((prev) => ({ ...prev, [item.entityName]: { status: json.status || 'error', label } }));
    } catch {
      setInspectResult((prev) => ({ ...prev, [item.entityName]: { status: 'error', label: '核验失败：无法访问该链接' } }));
    } finally {
      setInspecting('');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="flex items-center space-x-2">
            <SearchCheck className="w-5 h-5 text-[#0284C7]" />
            <h3 className="text-base font-serif font-bold text-stone-950">对象回应与公司实况核查</h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">AI 记忆召回 · 待核验</span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-3.5 text-xs leading-relaxed text-stone-600 space-y-2">
          <div className="flex items-center gap-2 text-stone-900">
            <Layers className="w-4 h-4 text-[#0284C7]" />
            <span className="font-serif font-bold">对象核查方法论</span>
          </div>
          <div><span className="font-serif font-bold text-stone-800">本质：</span>把“谁被谈到”升级成“谁有没有站出来回应”，再补一层“这家公司到底做得怎么样”的实况背景。</div>
          <div><span className="font-serif font-bold text-stone-800">功能：</span>回应部分判断有没有官方声明、财报电话会或媒体采访；公司实况部分深挖主营、经营数据、近期动态和风险点。</div>
          <div><span className="font-serif font-bold text-stone-800">思路：</span>先列出主要对象，再逐条标记“有公开回应 / 未见公开回应 / 待核验”，能给出官方链接和引句的，再交给来源核验接口去匹配原文。</div>
          <p className="text-[10px] text-stone-400 leading-relaxed">
            口径：本页不是实时联网检索，回应与经营数据来自 AI 记忆召回，可能过期或失准；“未见公开回应”只表示当前材料未显示回应，不是“经核实无人回应”。
          </p>
        </div>

        {checks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center">
            <p className="text-xs text-stone-600 leading-relaxed">
              尚未生成对象核查。点击下方按钮，让 AI 识别正文主要对象，并逐条核查回应与公司实况。
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={busy || !onRunSkill}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 text-xs font-serif font-bold transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? 'AI 正在核查对象…' : '生成对象核查'}
            </button>
            {err && <p className="mt-2 text-[11px] text-red-600">{err}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-serif font-bold text-stone-500 uppercase tracking-wider">
                共 {checks.length} 个主要对象
              </span>
              <button
                type="button"
                onClick={generate}
                disabled={busy || !onRunSkill}
                className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-stone-500 hover:text-stone-800 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {busy ? '重新生成…' : '重新生成'}
              </button>
            </div>

            <div className="space-y-4">
              {checks.map((item) => {
                const badge = statusBadge(item.responseStatus);
                const result = inspectResult[item.entityName];
                return (
                  <div key={item.entityName} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-stone-500" />
                        <span className="font-serif font-bold text-stone-950">{item.entityName}</span>
                        <span className="text-[10px] font-mono text-stone-400">{item.entityType || '公司'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}>{badge.text}</span>
                    </div>

                    <div className="rounded-lg bg-[#FAF8F5] px-3 py-2 text-xs text-stone-700">
                      <div className="flex items-center gap-1.5 text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider mb-1">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-[#0284C7]" />
                        是否回应 / 表态
                      </div>
                      <p>{item.responseSummary || '未说明该对象是否回应。'}</p>
                      {item.responseSourceHint && <p className="mt-1 text-[10px] text-stone-500">来源类型：{item.responseSourceHint}</p>}
                      {item.responseQuote && <p className="mt-1 text-[11px] text-stone-600 italic">“{item.responseQuote}”</p>}
                      {item.responseUrl && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a href={item.responseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#0284C7] hover:underline">
                            <ExternalLink className="w-3 h-3" /> 打开来源
                          </a>
                          <button
                            type="button"
                            onClick={() => void inspectSource(item)}
                            disabled={inspecting === item.entityName}
                            className="inline-flex items-center gap-1 text-[11px] font-serif font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
                          >
                            {inspecting === item.entityName ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                            {inspecting === item.entityName ? '正在核验…' : '核验引句'}
                          </button>
                          {result && (
                            <span className={`text-[10px] font-bold ${result.status === 'verified_quote' ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {result.status === 'verified_quote' ? <CheckCircle2 className="w-3 h-3 inline" /> : null} {result.label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-700 space-y-1.5">
                      <div className="text-[10px] font-serif font-bold text-stone-500 uppercase tracking-wider">公司实况深挖</div>
                      {item.companyProfile && (
                        <p><KeyTermHighlight text={`主营：${item.companyProfile}`} entities={(article.entityMentions || []).map((e) => e.name)} /></p>
                      )}
                      {item.keyFinancials && <p className="text-[11px] text-stone-600">经营数据：{item.keyFinancials}（待核验）</p>}
                      {(item.recentDynamics || []).length > 0 && (
                        <div>
                          <div className="text-[10px] text-stone-400">近期动态</div>
                          <ul className="space-y-0.5">
                            {(item.recentDynamics || []).map((d, i) => <li key={i} className="flex gap-1.5"><span className="text-stone-400">•</span>{d}</li>)}
                          </ul>
                        </div>
                      )}
                      {(item.riskPoints || []).length > 0 && (
                        <div>
                          <div className="text-[10px] text-stone-400">风险 / 争议点</div>
                          <ul className="space-y-0.5">
                            {(item.riskPoints || []).map((d, i) => <li key={i} className="flex gap-1.5"><span className="text-red-400">•</span>{d}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
