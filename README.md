# 见微 Genway · 于细微处，读懂新闻背后

「报刊为骨，数据为翼，光谱拆解为记」——面向严肃决策者/投资机构/产业开拓者的 **AI 认知型深度新闻阅读器**（React 19 + Vite + Express + Gemini 的单仓 Web 应用）。

> 当前形态：真实数据优先的本地情报工作台。默认不注入任何示例新闻、静态市场分或模板分析；没有 RSS/用户提交数据时显示空态，没有 AI Key 时不生成伪分析。仅显式设置 `JIANWEI_ENABLE_DEMO_DATA=1` 时才会加载历史演示语料，供开发回归使用。

## 快速开始

```bash
# 推荐：脱离会话的启动脚本（优先加载已构建的静态包，速度更快；服务退出后依然运行）
./scripts/start-server.sh start    # 启动/前台查看日志 scripts/server.log
./scripts/start-server.sh stop     # 停止

# 或开发调试方式（依赖当前终端/会话）
pnpm install          # 首次（需与 lockfile 匹配的 pnpm 版本）
cp .env.example .env  # 填入 GEMINI_API_KEY（可选；不填时 AI 功能明确显示未生成）
                        #   另可配 NEWS_FEED_URLS（RSS，逗号分隔）开启真实信源接入
pnpm dev              # 开发热更新模式 http://127.0.0.1:3100（仅本地调试用，首屏较慢）
pnpm build            # 产物到 dist/（客户端 + server.cjs）
pnpm start            # 生产静态模式运行 dist/server.cjs（需先 build，推荐日常使用）
pnpm lint             # tsc --noEmit
pnpm smoke            # 服务运行中时，对全部 API 做冒烟断言
pnpm test:func        # 功能级端到端测试（含设置热更新/真实 RSS 摄取闭环）
                      # 前置：python3 -m http.server 3211 --directory scripts/fixtures &
                      # 注意：smoke/test:func 以“无 API Key、无示例语料”为基线；配置 Key 后请另启无 Key 实例（BASE_URL=…）复测
```

## 核心板块与认知路径

| 板块 | 位置 | 说明 |
|---|---|---|
| **今日大事脉搏** ⚡ | 首页顶部首屏 | **30秒知大事**：宏观定调 + Top 3~5 重磅大事（突发拐点/关键推进/持续发酵） + 核心判断/纵深脉络 + 2分钟音频早报 |
| 首页信息流 | `/` 主视图 | 三态认知排版（标准/通俗/脱水）+ 分类/雷达筛选 + 今日突发与热词穿透 |
| **红蓝对抗博弈天平** ⚖️ | 新闻详情页首屏 | **深度探究背后与相反观点**：争议焦点本质 + 主流看好叙事 vs 相反批判质疑双栏对撞 + 前史溯源时间轴 + 利益方受损/受益透视 |
| **条件情景树与证伪线** 🔮 | 新闻详情页中轴 | **预测未来趋势**：短期（1~3个月）首个验证节点 + 中期（3~12个月）格局分水岭 + 核心盯盘变量 + **白纸黑字证伪失效红线** + **一键存入预测账本** |
| 详情页进阶研判 | 新闻详情页下半部 | 六页签认知路径：七要素·AI裁决 → 因果逻辑树沙盒 → 六大身份“与我何干” → 涟漪/多源 → **人机预测擂台** → 五层光谱五节奏 |
| **微信小程序体验中心** 📱 | 顶栏/页脚 QrCode | 拟真太阳码扫码直达 + 8:30微信晨报 + 触屏左右滑红蓝对撞 + 微信群高清长图分享 + 预测账本多端实时同步 + `<web-view>` 容器接入 |
| 情报中心 | `intelligence` | 战略态势指挥室：真实语料脉冲、跨事件文本信号、24H 热力、来源完整度、覆盖盲区、明日热度与 AI 战略顾问 |
| 专题档案 | `topics` | 长周期专题时间轴与博弈脉络 |
| 我的关注 | `my_focus` | 身份透镜、预测契约档案与回测、监控雷达、收藏、行动备忘录 |
| AI 提交分析 | Header CTA | 粘贴任意新闻 → `/api/analyze` 生成整套七要素/因果树/光谱新文章 |
| **晨报** ☀️ | Header CTA | 下次打开时首页主展示；可选本机系统通知或 Bark/ntfy/通用 Webhook，按身份、监控词与到期预测生成 |
| **设置** ⚙️ | Header 齿轮 | 用户昵称、AI 双通道（Gemini/DeepSeek）API Key 与模型、真实信源 RSS；服务端热更新并持久化（`data/settings.json`），含“测试连接” |

## 数据与 AI 的诚实边界（重要）

- **默认零演示数据**：服务默认从 `data/corpus.json` 读取真实运行时语料；文件为空且未配置 RSS 时，首页、情报中心、专题和预测契约均显示空态。历史演示数据只有在显式设置 `JIANWEI_ENABLE_DEMO_DATA=1` 时才允许加载。
- **真实 AI 端点**（`server.ts`，Provider 抽象层统一调用）：`/api/analyze`、`/api/strategic-advisor`、`/api/ask-nuance`、`/api/predict`、`/api/enrich`。通道支持 **Gemini 与 DeepSeek（OpenAI 兼容）**：默认有 GEMINI_API_KEY 用 Gemini，设 `DEEPSEEK_API_KEY` 即切 DeepSeek，`AI_PROVIDER=gemini|deepseek` 可强制；无任何 Key 时分析、顾问和探针明确返回未生成。预测的本地引擎仅输出确定性方向强度，不冒充概率。音频简报由当前真实语料摘要即时生成。
- **服务端派生骨架**：`GET /api/snapshot` 对真实运行时语料做分类、标签、地区与可追溯性统计，`meta.demo/corpus` 如实标注，未实现指标列于 `notYetDerived`。
- **真实信源接入**：`GET /api/feeds/status` 查看配置；`POST /api/feeds/ingest` 抓取 RSS 并入语料（`NEWS_FEED_URLS`）；`GET /api/corpus` 返回服务端运行时语料，首页信息流/搜索自动合并摄取的新条目；`POST /api/enrich` 对浅层条目做深度认知懒加载补全（无 Key 明确返回不可用，不造假）。
- **持久化**：收藏、关注标签、雷达关键词、预测契约、行动备忘录、身份与阅读模式均存于 localStorage（`useLocalState`）；服务端设置（Key/通道/信源/昵称）存于 `data/settings.json`；运行时语料以 `data/corpus.db` SQLite 为主存储，`data/corpus.json` 保留兼容快照。

## 目录速览

```
server.ts                     Express + Vite 中间件 + Gemini 代理端点（3100）
src/
  App.tsx                     全局状态/导航/模态编排（含 useLocalState 持久化）
  types.ts                    全量数据契约
  components/{home,intelligence,detail,focus,topics,modals...}
  data/                       newsData.ts / intelligenceData.ts / jargonData.ts
  hooks/useLocalState.ts      localStorage 持久化 state（支持版本 + 旧 key 迁移）
  hooks/useEscapeClose.ts     模态 Esc 关闭
  utils/dateUtils.ts          动态中文日期/时间
scripts/smoke.mjs             API 冒烟测试（pnpm smoke，19 项）
scripts/functional-test.mjs   功能级端到端测试（30 项，pnpm test:func）
scripts/fixtures/rss.xml      功能测试用本地 RSS 样例源
```

## 文档

- `CHANGELOG.md` — **2026-09-27 重大升级文档**：今日大事脉搏、红蓝思辨矩阵、条件情景树与证伪线、微信小程序生态落地
- `PROJECT_STATUS.md` — 项目状态收口、运行环境与阶段演进文档
- `FUNCTION_LOGIC_AUDIT_V2.md` — 全功能逻辑、可信度边界、研究依据与整改结果
- `FUNCTION_SCIENTIFIC_REVIEW.md` — 逐功能科学性、算法依据、逻辑关系和不可外推边界（含 2025-2026 补充研究）
- `SCIENCE_EVALUATION_PROTOCOL.md` — 评测协议：按发布时间切分、双人标注、Brier/ECE、Krippendorff α
- `DESIGN_ARCHITECTURE.md` / `ARCHITECTURE_RELATIONS.md` — 程序设计、数据架构与功能连接关系（已按 V2 同步）
- `EVALUATION.md` — 功能实现评测与提升空间
- `scripts/start-server.sh` — 脱离会话的后台启动/停止脚本
- `scripts/com.news.jianwei.server.plist` — macOS launchd 常驻模板（开机自启/崩溃自动拉起，安装命令见文件注释）
- `REMEDIATION_CHECKLIST.md` — 逐文件整改清单（A–AF：已完成批次 + 实测记录，含 strict 开启前置条件）
- `DATA_PIPELINE_DESIGN.md` — 真实数据采集 + 派生分析 + AI 编排的接入方案与 M0–M3 里程碑

## 已知限制 / 待办

- `tsconfig` 未开 `strict`：需先以匹配版本 `pnpm install` 后补装 `@types/react`/`@types/react-dom`（`DATA_PIPELINE_DESIGN.md` §9）；
- 未接入真实新闻源（设计见 `DATA_PIPELINE_DESIGN.md` §4–§6）；
- 情报中心全面板已语料真实派生（快照/跨事件共振/24H 热力/密度/信源健康/盲区覆盖扫描/明日热度点名）；其中盲区为“语料覆盖观察候选”、明日为“热度口径（非概率预测）”，均如实标注。真实“概率化明早点名”需日历事件与基准率建模（见设计文档 M2）。
