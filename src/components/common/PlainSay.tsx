import React from 'react';
import { KeyTermHighlight } from './KeyTermHighlight';

/** 生成内容旁的一句话人话：不堆术语，让非专业读者也能快速看懂。 */
export function PlainSay({ text, entities }: { text: string; entities?: string[] }) {
  const value = (text || '').trim();
  if (!value) return null;
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-serif font-black uppercase tracking-wider text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        一句话人话
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-stone-800">
        {entities && entities.length > 0 ? <KeyTermHighlight text={value} entities={entities} /> : value}
      </p>
    </div>
  );
}
