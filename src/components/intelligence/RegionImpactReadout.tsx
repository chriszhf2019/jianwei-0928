import React from 'react';
import type { RegionImpactInterpretation } from '../../types';
import { MethodBadge } from '../common/MethodBadge';
import { KeyTermHighlight } from '../common/KeyTermHighlight';

interface RegionImpactReadoutProps {
  readout: RegionImpactInterpretation;
  /** 用于正文高亮的实体词，来自该地区命中文章的主体标注。 */
  entities?: string[];
}

export const RegionImpactReadout: React.FC<RegionImpactReadoutProps> = ({
  readout,
  entities = [],
}) => {
  return (
    <div className="space-y-3 text-[11px] leading-relaxed text-stone-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-serif font-black text-stone-950">推演结果</span>
        <MethodBadge methodId="regional_impact" compact />
      </div>

      <div className="rounded-lg border border-sky-200 bg-white p-3">
        <div className="font-serif font-bold text-sky-900 mb-1">为什么在这里发生</div>
        <KeyTermHighlight
          text={readout.whyHere || '现有材料未说明'}
          entities={entities.slice(0, 60)}
        />
      </div>

      {readout.drivers.length > 0 && (
        <div>
          <div className="font-serif font-bold text-stone-700 mb-1">主要驱动因素</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {readout.drivers.map((driver) => (
              <li key={driver} className="rounded-lg border border-stone-200 bg-white px-2.5 py-2">
                <KeyTermHighlight text={driver} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {readout.crossRegion.length > 0 && (
        <div>
          <div className="font-serif font-bold text-stone-700 mb-1">跨地区与跨行业传导推演</div>
          <div className="space-y-1.5">
            {readout.crossRegion.map((item, index) => (
              <div
                key={`${item.target}-${index}`}
                className="grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2"
              >
                <div>
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 mr-1 text-[10px] font-bold ${
                      item.direction === 'benefit'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.direction === 'pressure'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {item.direction === 'benefit' ? '受益' : item.direction === 'pressure' ? '承压' : '分化'}
                  </span>
                  <span className="font-serif font-bold">{item.target}</span>
                </div>
                <div>
                  <KeyTermHighlight text={item.mechanism} />
                  <span className="ml-1 text-[10px] text-stone-400">模型置信：{item.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="font-serif font-bold text-amber-900 mb-1">接下来观察什么</div>
          <ul className="space-y-1">
            {readout.watch.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-amber-600">•</span>
                <KeyTermHighlight text={item} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="font-serif font-bold text-emerald-900 mb-1">行动指引</div>
          <KeyTermHighlight text={readout.guidance || '现有材料未说明'} />
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
        <div className="font-serif font-bold text-red-900 mb-1">判断边界与失效条件</div>
        <KeyTermHighlight text={readout.limits || '现有材料未说明'} />
      </div>
    </div>
  );
};
