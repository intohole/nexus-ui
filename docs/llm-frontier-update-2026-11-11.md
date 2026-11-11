# 大模型前端组件前沿更新研究（2026-11-11）

> 主题轮：2026-11 时点的前沿 LLM 前端组件库调研 → 对照 nexus-ui 现状逐项 gap 判定 → 本轮落地（v2.87.0）→ 下轮挂账。前序研究见 `docs/llm-interaction-upgrade-2026-10-27.md`（2025-10 时点，P0 streamdown 已兑现）。

## 一、前沿组件库 2026-11 时点扫描

### 1.1 Vercel AI Elements（对标主基准）

shadcn/ui 系 AI 组件集（2025-08 发布，官方宣布 2026-11 底迁入 shadcn/ui 主仓并弃用独立仓）。组件全家桶与 nexus-ui 对照：

| AI Elements 组件 | 职责 | nexus-ui 对应物 | 判定 |
|---|---|---|---|
| Conversation / ConversationContent | 会话容器+自动滚动 | nux-ai-chat `.nx-ai-chat-messages` + smartScroll | ✅ 已有（且多出滚动按钮/未读计数） |
| Message / MessageContent | 双态气泡+头像+角色 | nux-ai-chat 消息结构 + roles 配置 | ✅ 已有 |
| Response（Streamdown 驱动） | 流式 markdown 块级 memoize | NexusStreamdown（v2.74.0，同思路双容器） | ✅ 已有 |
| Reasoning | 可折叠推理块：流式中自动展开、完成自动收起、耗时显示 | helpers thinking 字段（手动开合） | ✅ 本轮补齐（reasoningAuto + thinkingMs） |
| Tool（可折叠参数/结果） | 工具调用三态卡 | nux-tool-call（running/done/error+幂等回填） | ✅ 已有且更完整（宽容归一+2000 字截断） |
| Actions（copy/retry/edit） | 消息操作条 hover 显示 | r137 已落码（feat.chatActions） | ✅ 本轮激活（默认开） |
| Branch（消息分支 prev/next 切换器） | 编辑后保留多分支可回溯 | 无（truncate 式编辑） | 判不收：需消息树存储与后端配合，业务无诉求 |
| PromptInput（附件/模型选择/提交） | 输入区全家桶 | inputConfig（autoResize/voice/快捷键） | △ 已有主体；附件内嵌挂账（见 §四） |
| Attachments（grid/inline/list） | 文件/图片/音视频附件面 | nux-file-upload（表单形态） | 判不收本轮：聊天内附件暂无消费方 |
| Context（token 用量） | 上下文用量显示 | meta 事件仅透传 emit | ✅ 本轮补齐（metaStrip 用量条） |
| CodeBlock | 代码块+复制 | NexusMarkdown.postProcess（hljs+复制） | ✅ 已有 |
| Task（任务列表状态） | 计划/任务步骤可视化 | nux-ai-task-progress + widgets steps | ✅ 已有 |
| Suggestion | 快捷追问 chips | quickReplies | ✅ 已有 |
| Source | 引用来源 | nux-citations（verdict 三态） | ✅ 已有（多出 verdict 语义） |
| Image / File | 生成媒体展示 | — | 判不收：无生成媒体业务 |
| WebPreview | iframe 沙箱预览 | — | 判不收：无 artifact 场景 |
| Loader / InlineCue | 加载态 | nux-ai-indicator / typing indicator | ✅ 已有 |

### 1.2 assistant-ui / CopilotKit（定位参考）

- **assistant-ui**（~7.9k star）：React headless 可组合原语，MIT。定位=「自己搭 UI 的人用的骨架」，与 nexus-ui「引入即用整组件」哲学不同向；其 runtime 抽象（线程/消息模型）值得借鉴的是**消息状态机与 UI 解耦**——nexus-ui 的 createActions 状态机（Vue-free 直测）已同构。
- **CopilotKit**（~28.6k star）：agent 框架+UI，商业分层；AG-UI 协议（agent 可读应用状态、调用 UI 组件）。对应 nexus 生态=GenUI widgets 族（NuxAiWidgetsRegistry），路线图裁决不变：**chat 是底座、结构化产出才上 GenUI**。
- 共同趋势：消息操作条、推理可视化、过程透明（工具/任务卡）已成 2026 聊天 UI 标配——与本轮激活动线方向一致。

## 二、配色语言研究（本轮第二交付）

### 2.1 前沿产品的 LLM 面配色语言

| 产品 | 语言 | 可迁移判据 |
|---|---|---|
| ChatGPT | 近单色：中性灰面、无强 accent、操作 hover 才现 | **克制**：AI 生成面不抢戏，操作条低调 |
| Claude | 暖米底+陶土 accent | 警惕：暖米+陶土已是生成式页面高发「AI 味」套版（设计判例），非本工作区方向 |
| Gemini | 白底+蓝 accent、大留白 | accent 只做行动层（按钮/链接），不染内容面 |
| Perplexity | 青绿 accent+引用数字化 | 引用=编号 chips，安静不喧哗 |
| GitHub Copilot | 暗石板+紫蓝 | 暗色下语义色提亮一档（400 档）保持 AA |

### 2.2 深蓝灰石板纪律映射（本工作区权威）

nexus-ui 的 LLM 语义面配色纪律（本轮复核固化，全部 token 化）：

1. **过程面降权**：思考过程/工具卡/引用=tertiary 表面（`--nx-bg-page`/`--nx-bg-tertiary` + 次级文字色），永不用 accent 染底——「AI 在工作」靠结构呈现，不靠颜色喊叫。
2. **accent 只上行动层**：发送按钮、链接、思考中脉冲点（`--nx-accent`/`--app-accent-rgb`）；27 应用主题自动换肤（`.app-*` 钩子）不受影响。
3. **语义三态**：工具/任务卡 running=accent 脉冲、done=中性、error=`--nx-danger` 系（本轮 token 化清偿 2 处硬编码 rgba）。
4. **用量条=mono 小芯片**：`--nx-font-mono` + muted 色 + full 圆角，信息存在但不入注意主区（默认关，`feat.metaStrip` 按需开）。
5. **禁纯黑/暗黑色系**：恒暗代码面 `--nx-code-block-bg` 是唯一技术例外（既有判例维持）。

本轮 CSS 改动全部经 token：新增样式消费 `--nx-*`/`--app-accent-rgb`（带 fallback），零新硬编码色。

## 三、本轮落地清单（v2.87.0）

| 项 | 文件 | 内容 |
|---|---|---|
| 语义路由上收单源 | js/nexus-chat.js（187→316 行，v1.2.0） | routeRichEvent/normalizeToolStatus/createStreamController/fallbackRequest 自 helpers 上收；helpers（401→325 行，破 400 红线）留委托别名，消费方零改动（组件文件不新增，业务 index.html 零改） |
| 控制面默认激活 | js/components/nux-ai-chat-helpers.js | defaultFeatures：chatActions:true / reasoningAuto:true / metaStrip:false（分级默认） |
| Reasoning 自动开合 | helpers + template + css | thinking 流式中自动展开（`_reasoningManual` 尊重手动）、收口自动收起、耗时标签（thinkingMs） |
| meta 用量条 | helpers metaChips + template + css | tokens/耗时 mono chips，默认关 |
| NexusTts 原语 | js/nexus-tts.js（163 行）+ build_all 登记 | 双通道（web speech↔服务端 TTS）、seq 守卫、config({storeKey,prefer,endpoint,requestor})；headless 无 UI 故不设 css |
| 消费方直替 | codeBlock app/static/js/voice.js（67→35 行） | Voice API 保持，NexusTts.config 承接 cb_voice/server 通道 |
| 点名接入 | aiPet frontend chat.js | chatActions 显式 opt-out（后端无消息级 regenerate API+同文幂等会撞「刚才问过」），reasoningAuto 自动获得；后端接线挂账 |

验证：mjs 全网绿（actions 63/63 含新增 13 断言、tts 24/24 全新、tool_call 29/29 修装载序）、pytest 18/18、E2E 探针 10/10（亮暗×三端截图）+ --prove-red 判红力自证（注入 display:none 双红）、聚合包双跑 md5 确定性。

## 四、下轮挂账（按价值排序，前 17 轮更新）

1. **aiPet 后端消息级 regenerate API**（截断+重答）+ 前端 @regenerate/@edit-resend 接线——控制面在服务端持久会话仓的正确打开方式。
2. **nexus.tasks 长任务原语落码**（契约稿在 docs/nexus-tasks-contract-draft-2026-10-29.md；前 17 轮判定：nexus-ui 前端半边须与 nexus-backend 同轮落，防未定契约返工+断头路）。
3. **createLLMStream 统一包装**（前 17 轮实察：底层已 NexusStream.consume 单源，差异面=业务错误码文案；开工前先做 6 仓语义矩阵盘点）。
4. ~~NuxAudioRecorder~~（**前 17 轮已落**：js/nexus-audio-recorder.js+memoria 直替；geniusStudent/aiPet 潜在消费待各业务轮）。
5. **geniusStudent 两处 speak() 收编 NexusTts**（answer-box.js/child-mode.js ~200 行）。
6. **聊天输入附件内嵌**（smartCode drag&drop ~60 行提炼进 inputConfig，AI Elements Attachments 对应物；元宝生态内嵌形态为中文侧佐证）。
7. **Branch 消息分支**（需消息树+后端配合，无诉求不立项）。
8. **smartCode 聊天全家桶退役**（~2620 行，最大单体收编，需 smartCode 业务轮配合）。
9. **灵犀 chat-stream.js 直替 NexusStreamdown**（2026-10-27 路线图 P2 遗留，等灵犀并行窗）。
10. **12 仓控制面采用度回访**：服务端持久仓（memoria/goldenFish 等）逐仓判定 opt-out 或接线；新增：memoria 录音直替后的回归观测（生产 E2E 录音动线）。

## 五、前 17 轮增补（2026-11-11 同日晚）：中文系产品配色扫描 + 语音原语 + 视觉走查

### 5.1 中文系 AI 产品配色语言（补充上轮海外五产品）

| 产品 | 语言 | 对 nexus-ui 的判据 |
|---|---|---|
| 豆包 | 温暖橙主色、简洁清新、年轻化 | **语音聊天做一级入口**=中文用户语音偏好实锤（NexusAudioRecorder/NexusTts 优先级的产品依据） |
| DeepSeek | 深蓝「蓝鲸」渐变、科技感、亮暗跟随 | 与本工作区「深蓝灰石板+天青」方向同族，非雷区验证 |
| 腾讯元宝 | 蓝紫、微信生态办公延伸 | accent 同样只做行动层；生态功能内嵌（文件/@提问）=Chat 内附件内嵌挂账的中文侧佐证 |
| Kimi | 极简浅色、蓝色调、长文本阅读优先 | 阅读密度克制=LLM 内容面不抢戏同判 |

平台层结论：nexus-ui 不锁品牌色（27 应用 `.app-*` 主题换肤），accent 行动层纪律与中文系四产品实践完全兼容；中文特有诉求（长辈大字/语音优先/口语化兜底文案）在 memoria 已有实践。

### 5.2 语音面四块格局与前 17 轮落位

| 块 | 承载物 | 状态 |
|---|---|---|
| ASR 直传（PCM→WAV） | nux-voice-input.js | 已有 |
| 实时语音流 | nux-voice-realtime.js | 已有 |
| 朗读 | NexusTts（前 16 轮） | 已有 |
| **录音+波形（MediaRecorder 形态）** | **NexusAudioRecorder（前 17 轮）** | **本轮补齐**——headless：mime 探测+AnalyserNode 能量帧回调（frameIntervalMs 节流）+时长上限+放弃语义（discarded 标志 blob 照给消费方自决）+starting 态竞态守卫+seq 守卫；消费方 memoria interview.js 直替（-60 行+离页 destroy 清理新增） |

### 5.3 前十七轮判定记录

- **createLLMStream 统一包装：判不落**。goldenStock SSEStream 实察=底层已是 NexusStream.consume 单源，薄包装的差异面是业务错误码文案（PICK_RATE_LIMIT 等）与 toast 行为——语义矩阵未盘点前上收会变成配置项堆砌；挂账保持，开工前先做 6 仓语义矩阵盘点。
- **nux-task-card 前端半边：判不落**。契约稿「待拍板清单」4 项未决（任务表位置/进度通道/迁移策略/取消粒度），按未定契约写前端=拍板后返工；且无后端配合即断头路（API 存在≠动线存在）。留 nexus-backend 专属窗同轮落。
- **helpers 委托别名判留**：全舰队业务仓零消费，唯一消费者=tests/test_tool_call.mjs 直调面+helpers 内部 env 回退链；10 行成本换直调面稳定。
- **工具链资产漂移观察**：handoff/46 描述的 s55_css_theme_audit、handoff/64 的 s111_var_audit、handoff/80 的 s103_line_census 三个审计器本地 scripts/ 均不存在（疑似夜轮侧资产或 r184 清理波及）——「挂账信息会过时，开工前必对表」第三形态：**索引描述的工具也要对表存在性**。
- 本轮 CSS 改动面=零（headless 原语不设 css 判例）；夹具页样式全部 var(--nx-*) token 带合法 fallback。

### 5.4 视觉走查三审判例（判官驱动）

一审抓夹具层假雷+真雷各半：代码块渲染链断裂（手动 innerHTML 缺 `nx-md` class → 语言标签游离视口+右端断口+暗色白底反转，**平台正确用法=NexusMarkdown.renderTo**）+夹具按钮裸样式（对表 var(--nx-*) token）。二审甄别：copy 按钮 hover-only 是产品语义非缺陷（**静态截图判 hover-only 面必须先 hover 再拍**）+hljs 真雷（恒暗代码面误引亮主题 github.min.css → **恒暗面恒引暗色语法主题**）。三审全 PASS。

## 参考

- Vercel AI Elements：elements.ai-sdk.dev（2025-08 发布；官方公告 2026-11 底并入 shadcn/ui，独立仓弃用）
- assistant-ui：assistant-ui.com；CopilotKit：docs.copilotkit.ai（AG-UI 协议）
- 前序研究：docs/llm-interaction-upgrade-2026-10-27.md（范式/流式工程/GenUI 边界三定谳仍有效）
- Streamdown：vercel.com/changelog/introducing-streamdown；Chrome 官方《Best practices to render streamed LLM responses》
