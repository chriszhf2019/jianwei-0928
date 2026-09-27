import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, AlertOctagon, DollarSign, Clock } from 'lucide-react';

interface CostMetrics {
  dailyBudget: number;
  dailySpent: number;
  remaining: number;
  usage: {
    calls: number;
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  byProvider: Record<string, { calls: number; promptTokens: number; outputTokens: number; totalTokens: number; }>;
  alerts: string[];
  rateLimitStatus: { current: number; limit: number; remaining: number; };
}

export function AICostWidget() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchCostMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchCostMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCostMetrics = async () => {
    try {
      const response = await fetch('/api/ai/cost');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('Failed to fetch cost metrics:', e);
    }
  };

  if (!metrics) {
    return (
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <Activity className="w-4 h-4" />
          <span>正在加载 AI 成本...</span>
        </div>
      </div>
    );
  }

  const budgetPercentage = (metrics.dailySpent / metrics.dailyBudget) * 100;
  const isOverBudget = metrics.dailySpent > metrics.dailyBudget;
  const isApproachingLimit = budgetPercentage > 80;
  
  const progressBarColor = isOverBudget 
    ? 'bg-red-500'
    : isApproachingLimit
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className={`w-5 h-5 ${isOverBudget ? 'text-red-500' : isApproachingLimit ? 'text-amber-500' : 'text-emerald-600'}`} />
          <span className="font-semibold text-gray-900">AI 成本监控</span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-gray-400">
            更新: {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Budget progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">今日预算</span>
          <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            ¥{metrics.dailySpent.toFixed(2)} / ¥{metrics.dailyBudget}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${progressBarColor}`}
            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>已用 {budgetPercentage.toFixed(0)}%</span>
          <span>剩余 ¥{metrics.remaining.toFixed(2)}</span>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-[10px] text-gray-500 mb-0.5">调用次数</div>
          <div className="text-sm font-medium text-gray-900">{metrics.usage.calls.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-[10px] text-gray-500 mb-0.5">Token</div>
          <div className="text-sm font-medium text-gray-900">{(metrics.usage.totalTokens / 1000).toFixed(1)}k</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-[10px] text-gray-500 mb-0.5">限制</div>
          <div className="text-sm font-medium text-gray-900">{metrics.rateLimitStatus.limit.toLocaleString()}</div>
        </div>
      </div>

      {/* Provider breakdown */}
      {Object.keys(metrics.byProvider).length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 mb-1">提供商分布</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(metrics.byProvider).map(([key, value]) => {
              const [provider, model] = key.split(':');
              return (
                <div key={key} className="bg-gray-50 rounded px-2 py-1">
                  <div className="text-[10px] text-gray-600">
                    <span className="capitalize font-medium">{provider}</span> • <span className="text-[10px]">{model}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {value.calls} 次 • {value.totalTokens.toLocaleString()} tokens
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts */}
      {metrics.alerts.length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              {alert.includes('🛑') ? (
                <AlertOctagon className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-gray-700">{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick estimate */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <Activity className="w-3 h-3" />
          <span>预估下一次请求 (500字符):</span>
        </div>
        <div className="flex gap-4 text-[10px] text-gray-700 mt-1">
          <span>预计Tokens: ~150</span>
          <span>估算成本: ¥0.0001-0.0005</span>
        </div>
      </div>
    </div>
  );
}

export default AICostWidget;
