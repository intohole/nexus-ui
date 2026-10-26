# 大模型交互深度研究与体系化建设方案（2026-10-27）

> 主题轮：深度研究 2025-2026 LLM 应用交互范式前沿 → 对照工作区现状找升级点 → 体系化分批路线 → P0 落地（本轮已部署 v2.74.0）。

## 一、外部研究结论（多源交叉验证）

### 1.1 Agentic UX 主导范式（Fuselab / Setproduct 16 patterns / Hatchworks / Smashing Magazine 2025-07）

- **过程透明**：展示 live 进度、计划、运行中的工具步骤，而非 silent spinner——「chat-first 正在被 control surfaces 取代」（审批、回执、日志、undo、安全恢复）。
- **人机控制面**：approval gates（不可逆/高影响动作才审批）、undo/override、confidence signaling、graceful failure recovery。
- **HITL 工程模式**（Scalekit / Agno / MS AG-UI）：pause/resume + 持久化 checkpoint、sensitivity-based 触发、timeout/escalation、audit trail。

### 1.2 流式渲染工程主导模式（Vercel Streamdown / Chrome 官方 / comark）

> 「split the stream into markdown blocks → auto-close incomplete syntax at the tail → memoize already-complete blocks → only re-render the active block on each token」

- 全量 re-parse per chunk 是滚动/性能瓶颈（CAIPE 架构复盘实证）。
- 尾块自动闭合（未闭合 fence/粗体/行内码）消除帧间闪烁。
- Chrome 官方发布《Best practices to render streamed LLM responses》背书。

### 1.3 生成式 UI 的务实边界

- Pro：Vercel AI Elements（2025-08 发布）组件生态成熟，tool-call → live component 流。
- Con（UX Collective / LogRocket）：「chat box 不是 UI 范式，只是 shipped 默认」；GenUI 增复杂度未必改善结果；AI overuse harms UX。
- **裁决：chat 是底座，结构化产出场景才上 generative UI**——工作区 widgets-rich 族（table/cards/steps/form/chart/confirm）已在此方向，不必推倒。

## 二、内部现状盘点（两个 Explore agent 全仓取证）

### 2.1 平台层水位（nexus / nexus-ui / ironman / promptManager）

已有：`sse_chat_stream_v2`（SSE+断连检测+心跳+背压+drain_on_disconnect）、ChatEngine 五扩展点、nexus-stream.js（SSE 单源）、ChatController（打断/typingCursor）、nux-ai-chat（smartScroll/thinking 折叠/toolCalls/references/widgets/credibility）、routeRichEvent 富事件路由、nux-tool-call 三态、task-progress 组件。

### 2.2 业务层水位差（7 应用横评）

| 应用 | 流式 | 打断 | 过程可视化 | 结构化输出 |
|---|---|---|---|---|
| 灵犀 | ✓ token SSE | ✓ | ✓ 工具卡+stage | ✓ nux-result-view |
| aiPet | ✓ | ✓ | △ | ✓ |
| MiaoBi | ✗ 进度流 | ✗ | ✓ 边写边看 | ✓ |
| LifeCompass | ✗（roadmap 有） | ✗ | △ 2 分钟纯转圈 | ✓ artifact 卡 |
| goldenStock | △ 仅选股 | △ 仅选股 | ✓ 选股步骤+ETA | ✓ |
| verseCraft | ✗ 轮询 | ✗ | △ 全屏遮罩 | ✓ |
| moutain | ✗ 轮询 | ✗ | △ 仅轮数 N/M | ✓ 引用+置信度 |

### 2.3 系统性缺口（按严重度）

1. **流式 markdown 每 chunk 全量重渲**（nux-ai-chat-template v-html 调 NexusMarkdown.render 全文 + DOMPurify 全文）——长回复/代码块场景卡顿+抖动，影响全部 12 个流式页面。
2. **事件协议四套并存**：streaming.py widget 族 / chat engine delta-error-done / nexus-agent ChatChunk / MiaoBi 自定义——routeRichEvent 不认识后两者的方言，各业务自行接线。
3. **长任务无平台原语**：任务注册/查询/进度事件/任务锚页面各仓自建（MiaoBi 样板好但孤岛；moutain/verseCraft/LifeCompass 粗糙）。
4. **对话控制面缺件**：全舰队无「重新生成」（仅灵犀失败重试）、无「编辑重发」；aiPet/LifeCompass 失败只有一行文案。
5. 平台 SSE 助手采用不齐（suki 自写无心跳；challengePlanet 等裸 StreamingResponse）；ChatEngine 仅 4 仓采用。
6. thinking 档位两端不一致（nexus bool+budget vs promptManager task_type→effort 档位表）；promptManager 流式无 failover。

## 三、体系化路线（分批拍板）

| 批次 | 内容 | 状态 |
|---|---|---|
| **P0 流式渲染引擎**（本轮） | nexus-streamdown：块切分+尾块自动闭合+稳定块缓存，nux-ai-chat 接入 | ✅ 已部署 v2.74.0 |
| P1 对话控制面 | 重新生成（泛化 retry 到成功消息）+ 编辑重发 + 失败态标准化（对齐 S25 四态） | backlog |
| P1 长任务平台原语 | nexus.tasks（注册/进度/取消/锚点）+ 统一进度事件协议，收编 MiaoBi 样板，moutain/verseCraft/LifeCompass 接入 | backlog |
| P2 协议收口 | routeRichEvent 升格为唯一语义层（收编 ChatChunk/MiaoBi 方言）；ChatEngine/SSE 助手收口；thinking 档位对表 | backlog |
| P2 灵犀直替 | chat-stream.js 自渲染切 NexusStreamdown（灵犀自研渲染面是最后一块未收编） | backlog |

**P0 拍板理由（三轮论证）**：①价值密度——影响全部 12 个流式页面，灵犀/aiPet 是最高频对话面；②体系化——平台单点改造+契约测试+守底样张成套交付，非散点补丁；③可行性——纯前端平台组件库单仓改动，风险可控一轮可交付（长任务原语要动 nexus 后端+多应用，超一轮预算）。

## 四、P0 落地记录（v2.74.0）

### 4.1 设计

- **核心洞察**：Vue `v-html` 只在绑定值变化时才更新 DOM——把流式正文拆成「稳定区（已完成块拼接）+ 活跃尾块」双容器，稳定区 html 字符串不变则浏览器零重建，即获得 Streamdown 的块级 memoize，无需脱离 Vue。
- **nexus-streamdown.js**（新原语，132 行，Vue-free 可直测）：
  - `findCut(text)`：段落切点状态机——未闭合 fence/`$$` 数学块整体留活跃块；同类型列表/表格被空行分隔不切（防 ol 重编号、断表格）；fence/数学块边界行参与切点判定。
  - `autoCloseTail(text)`：补齐未闭合 fence / 行内反引号 / `**` / `$$`，消除帧间闪烁。
  - `update(fullText, state)`：前缀判定增量缓存（重试/编辑自动失效）；稳定区仅在块推进时重渲，活跃块每帧重渲。
- **nux-ai-chat 接入**：`feat.streamBlocks` 开关（默认开）；watch 挂消息 content + rAF 合帧（helpers 的直写路径零改动）；`feat.streamBlocks && m.streaming && m.activeHtml` 双容器分支，settle 后 streaming=false 自动收口单容器（postProcess 语义不变）；缺原语自动回退全文渲染。
- **CSS 接缝补偿**：`.nx-md .nx-md-stream-stable:not(:empty) > :last-child` 恢复稳定区尾块 margin（特异性 0,3,0 压过 `p:last-child` 归零规则）。

### 4.2 验证

- 单测 `tests/test_streamdown.mjs` 28 断言（切点状态机 11 / 自动闭合 8 / 缓存复用与性能形态 9），全测试网 215 断言全绿。
- 浏览器真链 e2e `tests/e2e_streamdown.html`（守底样张，真实动线 fill+Enter 触发）：stableCounts `[1,1,1,2,3,3,3,4,4,4,5,5]` 稳定块单调推进、完成后收口单容器、表格/高亮代码/KaTeX 全对、零 JS 错误、截图视觉验收通过。
- 性能形态：渲染成本从 O(chunk×全文)（数百次全文 marked+DOMPurify）降到 O(块数×全文 + 帧数×尾块)——流式期间稳定区全周期只渲染一次/块。

### 4.3 发布

- v2.73.0 → v2.74.0，发版链 C1-C7 全绿，`--ship` 四节点（master/god/edge-03/edge-04）240 文件 md5 一致；CDN `v2.74.0/js/nexus-streamdown.js` 与聚合包实测可达。
- **12 个消费 nux-ai-chat 的应用全部经 nexus-all.js 聚合包零改动自动获得升级**（streamdown 已注册进 build_all.py FILES + aggregate_core.py CORE）。
- 提交：cb8d6e4（主轮）/ 23f12b9（e2e 样张）/ ac6f87d（引用修正）。

### 4.4 过程教训（已入台账）

- 发版链 `--verify` 的 C3 是**全工作区口径**：并行仓（灵犀）在途改动会造成指纹假 FAIL——先 `git status` 归因责任面（改动的 mtime+git diff 证据），非自己仓不 `--fix`（避免与并行会话打架）；本轮 FAIL 在等待期自行转绿（并行会话自行刷指纹提交）。

## 五、遗留与下轮入口

1. P1 对话控制面（重新生成/编辑重发）——nux-ai-chat createActions 泛化 retry 即可承载，建议接 aiPet 先行验证。
2. P1 长任务平台原语——先出 nexus.tasks 契约稿（对齐 S51 后台任务终态契约），拍板后落码。
3. P2 协议收口——routeRichEvent 方言收编建议挂中间件轮（动 nexus-backend）。
4. 灵犀 chat-stream.js 直替 NexusStreamdown（灵犀当时有并行会话在写，本轮避让未动）。
5. stable 分块级增量缓存（块推进时 O(新块) 而非 O(稳定区)）——当前实测无感，量大再优化。

## 参考

- Vercel Streamdown（block memoization cookbook）：ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization
- Chrome：《Best practices to render streamed LLM responses》developer.chrome.com/docs/ai/render-llm-responses
- comark autoCloseMarkdown：comark.dev/reference/auto-close
- Setproduct《16 AI agent UI design patterns》；Fuselab《Agent UX 2026》；Hatchworks《Agent UX Patterns》
- Vercel AI Elements（2025-08）：vercel.com/changelog/introducing-ai-elements
- HITL：scalekit.com/blog/human-in-the-loop-tool-calling；learn.microsoft.com AG-UI
