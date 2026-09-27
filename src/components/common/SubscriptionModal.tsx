import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  Clock,
  Eye,
  Globe2,
  Laptop,
  Loader2,
  MessageSquare,
  Send,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import type { BriefingSettings } from '../../types';
import { useEscapeClose } from '../../hooks/useEscapeClose';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: BriefingSettings) => void;
}

type Feedback = { ok: boolean; text: string } | null;

function defaultSettings(): BriefingSettings {
  return {
    enabled: true,
    displayAfter: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    personaId: 'investor',
    externalChannel: 'none',
    includeRadar: true,
    includePredictions: true,
  };
}

const CHANNEL_OPTIONS = [
  {
    id: 'none' as const,
    label: '下次打开见微时展示',
    description: '零配置，作为首页主模块展示一次',
    icon: Laptop,
  },
  {
    id: 'system' as const,
    label: '本机系统通知',
    description: '在运行服务的电脑上弹出系统通知',
    icon: Bell,
  },
  {
    id: 'webhook' as const,
    label: '手机 / 自定义 Webhook',
    description: '兼容 Bark、ntfy 和通用 JSON Webhook',
    icon: Smartphone,
  },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  useEscapeClose(isOpen, onClose);
  const [settings, setSettings] = useState<BriefingSettings>(defaultSettings);
  const [systemAvailable, setSystemAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoading(true);
    setFeedback(null);
    fetch('/api/briefing/settings', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('load_failed')))
      .then((data) => {
        setSettings({ ...defaultSettings(), ...(data.settings || {}) });
        setSystemAvailable(!!data.systemNotificationAvailable);
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setFeedback({ ok: false, text: '晨报设置读取失败，请确认本地服务已启动。' });
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [isOpen]);

  if (!isOpen) return null;

  const updateSettings = (patch: Partial<BriefingSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const save = async (enabled = settings.enabled) => {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/briefing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { ...settings, enabled } }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'save_failed');
      }
      setSettings(data.settings);
      onSaved?.(data.settings);
      setFeedback({
        ok: true,
        text: enabled
          ? '晨报已开启。下次进入见微时，会在设定时间后优先展示。'
          : '晨报已关闭，不再生成或推送每日简报。',
      });
      if (!enabled) onClose();
    } catch (error: any) {
      setFeedback({
        ok: false,
        text:
          String(error?.message || error).includes('webhook_url_required')
            ? '请填写 Webhook 地址。'
            : '保存失败，请检查地址或稍后重试。',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/briefing/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.result?.reason || data?.error || 'test_failed');
      }
      setFeedback({ ok: true, text: '测试投递成功。' });
    } catch (error: any) {
      setFeedback({ ok: false, text: `测试失败：${String(error?.message || error)}` });
    } finally {
      setTesting(false);
    }
  };

  const channels = CHANNEL_OPTIONS.filter(
    (channel) => channel.id !== 'system' || systemAvailable
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="w-full max-w-xl bg-[#FAF8F5] border-2 border-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-stone-950">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold tracking-wide">见微晨报</h3>
                <p className="text-[11px] text-stone-400">
                  下次打开时优先展示，也可同时推到本机或手机
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded text-stone-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-stone-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                正在读取晨报设置…
              </div>
            ) : (
              <>
                <section className="space-y-2">
                  <div className="text-xs font-serif font-bold text-stone-700">送达方式</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {channels.map((channel) => {
                      const Icon = channel.icon;
                      const active = settings.externalChannel === channel.id;
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => updateSettings({ externalChannel: channel.id })}
                          className={`rounded-xl border-2 p-3 text-left transition-colors ${
                            active
                              ? 'border-stone-900 bg-white shadow-xs'
                              : 'border-stone-200 bg-stone-50 hover:border-stone-400'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mb-2 ${active ? 'text-[#E3120B]' : 'text-stone-500'}`} />
                          <div className="text-xs font-serif font-bold text-stone-900">{channel.label}</div>
                          <div className="text-[10px] text-stone-500 mt-1 leading-relaxed">{channel.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {settings.externalChannel === 'webhook' && (
                  <section className="space-y-2">
                    <label className="block text-xs font-serif font-bold text-stone-700">
                      Webhook 地址
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="url"
                        value={settings.webhookUrl || ''}
                        onChange={(event) => updateSettings({ webhookUrl: event.target.value })}
                        placeholder="https://api.day.app/... 或 https://ntfy.sh/your-topic"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:border-stone-900"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 leading-relaxed">
                      Bark 和 ntfy 会自动适配；其他地址会收到包含标题、摘要和晨报内容的 JSON POST。
                    </p>
                  </section>
                )}

                <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-700">
                      <Clock className="w-3.5 h-3.5" />
                      展示时间
                    </div>
                    <select
                      value={settings.displayAfter}
                      onChange={(event) => updateSettings({ displayAfter: event.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 text-xs font-mono"
                    >
                      {['07:00', '07:30', '08:00', '08:30', '09:00'].map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-stone-400">到达时间后首次打开应用时主展示一次。</p>
                  </label>

                  <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-stone-700">
                      <Globe2 className="w-3.5 h-3.5" />
                      内容范围
                    </div>
                    <label className="flex items-center gap-2 text-xs text-stone-700">
                      <input
                        type="checkbox"
                        checked={settings.includeRadar}
                        onChange={(event) => updateSettings({ includeRadar: event.target.checked })}
                      />
                      包含监控词命中
                    </label>
                    <label className="flex items-center gap-2 text-xs text-stone-700">
                      <input
                        type="checkbox"
                        checked={settings.includePredictions}
                        onChange={(event) => updateSettings({ includePredictions: event.target.checked })}
                      />
                      包含到期待复核预测
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-950">
                  <div className="flex items-center gap-1.5 font-serif font-bold mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    晨报如何生成
                  </div>
                  <p className="leading-relaxed">
                    先按多来源、监控词、身份相关度和赛道集中度对当前语料排序，再形成可复核摘要。不会为了填满版面编造新闻或概率。
                  </p>
                </section>

                {feedback && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${
                    feedback.ok
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-red-300 bg-red-50 text-red-800'
                  }`}>
                    {feedback.text}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {settings.enabled && (
                    <button
                      type="button"
                      onClick={() => void save(false)}
                      disabled={saving}
                      className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs text-stone-600 hover:text-red-700 disabled:opacity-50"
                    >
                      关闭晨报
                    </button>
                  )}
                  {settings.externalChannel !== 'none' && (
                    <button
                      type="button"
                      onClick={() => void sendTest()}
                      disabled={testing || (settings.externalChannel === 'webhook' && !settings.webhookUrl)}
                      className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-serif font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      测试投递
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void save(settings.enabled ? settings.enabled : true)}
                    disabled={saving}
                    className="ml-auto px-5 py-2 rounded-lg bg-stone-900 hover:bg-[#E3120B] text-white text-xs font-serif font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {settings.enabled ? '保存晨报设置' : '开启晨报'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
