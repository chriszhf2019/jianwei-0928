import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Smartphone,
  Sparkles,
  QrCode,
  BellRing,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Compass,
  MessageSquare,
  Flame,
  Radio,
} from 'lucide-react';
import { useEscapeClose } from '../../hooks/useEscapeClose';

interface WeChatMiniProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname?: string;
}

export const WeChatMiniProgramModal: React.FC<WeChatMiniProgramModalProps> = ({
  isOpen,
  onClose,
  nickname,
}) => {
  useEscapeClose(isOpen, onClose);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isWeChatEnv, setIsWeChatEnv] = useState(false);
  const [isMiniProgramWebView, setIsMiniProgramWebView] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const inWx = ua.includes('micromessenger');
      setIsWeChatEnv(inWx);
      const inMini =
        (window as any).__wxjs_environment === 'miniprogram' ||
        ua.includes('miniprogram');
      setIsMiniProgramWebView(inMini);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyMiniProgramPath = () => {
    const currentUrl = window.location.href;
    const shareText = `【见微 Genway】于细微处，读懂新闻背后。深度事实拆解与红蓝对抗。微信内搜索小程序「见微情报」或点击链接在微信中打开：${currentUrl}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white border-2 border-stone-900 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* 模态框顶部 */}
          <div className="bg-stone-950 text-stone-100 px-5 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#07C160] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                微
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-serif font-black text-white flex items-center gap-1.5">
                  <span>微信小程序使用指南</span>
                  <span className="text-[10px] font-mono bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700">
                    WeChat Mini App
                  </span>
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 模态框主要内容区 */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* 微信内置环境感知提示 */}
            {isWeChatEnv && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0 animate-ping" />
                <div className="space-y-1">
                  <b className="font-bold">已检测到当前正处于微信客户端中！</b>
                  <p className="text-emerald-800 leading-relaxed">
                    您可以直接点击右上角【···】选择<b>「添加到我的小程序」</b>或<b>「添加到桌面」</b>，下次在微信下拉即可 1 秒直达今日大事。
                  </p>
                </div>
              </div>
            )}

            {/* 扫码体验区域 */}
            <div className="rounded-2xl border-2 border-stone-900 bg-stone-50 p-5 flex flex-col sm:flex-row items-center gap-5">
              {/* 拟真见微小程序太阳码图形 */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="relative w-36 h-36 rounded-2xl bg-white border-2 border-stone-900 p-2.5 shadow-md flex items-center justify-center group">
                  {/* 小程序码几何外环与中央微标 */}
                  <svg className="w-full h-full text-stone-900" viewBox="0 0 120 120" fill="none">
                    <circle cx="60" cy="60" r="54" stroke="#07C160" strokeWidth="4" strokeDasharray="6 4" />
                    <circle cx="60" cy="60" r="44" stroke="#1C1917" strokeWidth="2" />
                    {/* 模拟太阳码放射光芒花瓣条纹 */}
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                      <line
                        key={deg}
                        x1="60"
                        y1="14"
                        x2="60"
                        y2="22"
                        stroke="#07C160"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        transform={`rotate(${deg} 60 60)`}
                      />
                    ))}
                    {/* 内部二维码矩阵点状模拟 */}
                    <rect x="36" y="36" width="48" height="48" rx="8" fill="#1C1917" />
                    <text x="60" y="66" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontFamily="serif" fontWeight="900">
                      微
                    </text>
                  </svg>
                  <div className="absolute -bottom-2.5 bg-[#07C160] text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white shadow-xs">
                    微信扫一扫
                  </div>
                </div>
                <span className="text-[10px] text-stone-500 font-mono mt-3.5">
                  微信扫码随时随地速查
                </span>
              </div>

              {/* 右侧速读权益 */}
              <div className="space-y-2.5 min-w-0">
                <div className="text-xs font-mono uppercase tracking-wider text-[#07C160] font-bold">
                  GENWAY WECHAT EXPERIENCE
                </div>
                <h4 className="text-base sm:text-lg font-serif font-black text-stone-950 leading-tight">
                  把见微装进微信 · 随时洞悉背后动向
                </h4>
                <p className="text-xs text-stone-600 font-serif leading-relaxed">
                  无需下载独立 App，依托微信极速启动。完美适配手机触屏与单手操作，随时在碎片时间消化宏观脉搏与行业反方博弈。
                </p>

                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMiniProgramPath}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-[#07C160] text-white text-xs font-serif font-bold transition-colors shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '已复制微信打开口令' : '复制微信打开链接'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 大微信小程序专属核心功能 */}
            <div className="space-y-3">
              <div className="text-xs font-serif font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#07C160]" />
                <span>见微小程序 4 大核心使用场景</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 特性 1 */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1.5 hover:border-stone-400 transition-colors">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                    <BellRing className="w-4 h-4 text-amber-500" />
                    <span>8:30 晨报与变量异动预警</span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed">
                    工作日清晨微信自动推送 3 件焦点大事。一旦关注的事件触发「盯盘变量阈值」或「证伪红线」，微信服务通知第一时间精准提醒。
                  </p>
                </div>

                {/* 特性 2 */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1.5 hover:border-stone-400 transition-colors">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                    <Smartphone className="w-4 h-4 text-sky-500" />
                    <span>触屏左右滑：红蓝量化对冲</span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed">
                    针对手机触屏专门调校的滑动手势：左滑看多方逻辑与指标，右滑看做空者挑刺质疑与风险定量锚点，单手快速把握两面底牌。
                  </p>
                </div>

                {/* 特性 3 */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1.5 hover:border-stone-400 transition-colors">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    <span>媒体沉默盲区与高清卡长图</span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed">
                    一键生成包含「媒体沉默盲区 (Blindspot)」与利益图谱的高清长图，在微信高管群与朋友圈分享，直击谁在发声谁在回避。
                  </p>
                </div>

                {/* 特性 4 */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1.5 hover:border-stone-400 transition-colors">
                  <div className="flex items-center gap-2 font-serif font-bold text-stone-900">
                    <Radio className="w-4 h-4 text-purple-500" />
                    <span>置信度契约与证伪红线同步</span>
                  </div>
                  <p className="text-stone-600 text-[11px] leading-relaxed">
                    电脑端存入的 Tetlock 概率预测账本，手机微信自动同步。到期时系统由真实语料全自动回测核验，杜绝事后诸葛亮。
                  </p>
                </div>
              </div>
            </div>

            {/* 小程序开发者集成与部署指引 */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-stone-800">
                  技术架构：微信小程序 Web-view 容器一键对接
                </span>
                <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                  零改造成本
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                见微采用响应式现代化架构，任何微信小程序只需在页面中配置一行代码即可将见微无缝嵌入：
              </p>
              <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto">
                {`<web-view src="${typeof window !== 'undefined' ? window.location.origin : 'https://jianwei.app'}" />`}
              </pre>
              <div className="text-[10px] text-stone-500 flex items-center gap-1 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>全站已完成微信内置浏览器 HTTPS 证书校验与移动端 Safe Area 沉浸适配。</span>
              </div>
            </div>
          </div>

          {/* 模态框底部操作 */}
          <div className="bg-stone-100 px-5 py-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-stone-500 font-serif">
              微信内搜索「<b>见微情报</b>」或在聊天中发送链接直接体验
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-serif font-bold transition-colors"
            >
              我知道了
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
