# AgentUI Kit 借鉴对照纪要（2026-11-28）

> 轮次：nexus-ui AI 友好性升级（全面原语补齐整包）。对照三参照逐项判定「已采纳 / 已有 / 判留 / 登记触发器」。
> 前序稿：docs/llm-interaction-upgrade-2026-10-27.md、docs/llm-frontier-update-2026-11-11.md（11-11 对 Vercel AI Elements 的逐项 gap 判定维持有效，本稿不翻案）。

## 参照物（out/agentui-kit-ref/）

| 参照 | 来源 | 形态 | 借鉴价值 |
|------|------|------|------|
| agent-elements | [21st-dev/agent-elements](https://github.com/21st-dev/agent-elements)（MIT，★111） | React 19 + Tailwind + shadcn registry，26 组件 | 模式级主参照：todo/plan/diff/审批卡形态 + **skill 分发模式**（skills/agent-elements/SKILL.md 教 AI 助手认组件目录与 prop 形状） |
| agent-ui | agno-agi/agent-ui | Next.js 聊天模板（35 件） | 薄；AgentThinkingLoader/references/多模态呈现 |
| ag-ui | ag-ui-protocol/ag-ui spec/1.0 | 协议 schema + fixtures | 事件契约基线（v2.98.0 已对齐，本轮 schema 化） |

## 逐项判定

| 参照模式 | 判定 | 落点 |
|------|------|------|
| TodoTool 任务清单卡（pending/in_progress/completed + 变更检测 + shimmer 占位） | **已采纳**（本轮） | `nux-plan-card`：四态 pending/running/done/error（与 tool-call/subagent-track 同族词表，扩 error 态）+ 进度头 + 已完折叠 + interactive |
| EditTool diff 卡（@pierre/diffs 渲染 + diffStats 彩色 tokens + 渐隐折叠 + ToolApprovalFooter） | **已采纳**（本轮） | `nux-diff-review`：per-hunk 采纳/驳回 + 整体决定 + unified diff 直喂解析（`NuxDiffReview.parse`）。渲染层裁剪：不引 diff 渲染库/不做逐行语法着色（CDN 模式无依赖链，行级 add/del/ctx 着色为主）——记为执行简化 |
| PlanTool 计划审批卡（summary 折叠 + approve） | **判留** | 与既有 nux-interrupt-card（approve/continue/reject/pause/edit + allowEdit）职能重叠，不重复造 |
| Question tool（单选/多选/自由文本澄清） | **已有** | nux-clarify-card（本轮补 llms.txt 文档段；此前仅索引列名无文档） |
| tool-registry.ts（工具渲染器注册表 + 兜底 GenericTool） | **已有**（形态同构） | NuxAiWidgetsRegistry + 内置 6 型；本轮经 registry 扩展 diff/plan/telemetry 三型（零改动分发器，事件翻译进白名单动词） |
| skill 分发模式（SKILL.md 教 AI 助手认组件目录/prop 形状/约束） | **已采纳**（形态适配） | nexus-ui 契约面：llms.txt 头部硬约束声明 + `data/contract/nexus-ui.contract.json`（生成器 `scripts/gen_ai_contract.py` 从源码提取 props/emits/statics，`--check` 漂移门禁）+ `data/contract/ai-events.schema.json`（事件面机校验）。差异：nexus-ui 消费方是 33 仓的 AI 编码助手而非第三方 shadcn 用户，契约走仓内生成物而非 npm registry |
| run telemetry（跨消息 run/step 总览） | **已采纳**（本轮） | `nux-run-telemetry`：`collect(messages)` 静态聚合（meta.runId 分组/tokens/工具/席数/终态对表 NexusStop 四态）+ 折叠面板 |
| ThinkingTool / ThinkingTool 卡 | **已有** | msg.thinking 折叠块 + reasoningAuto 自动开合 + thinkingMs 耗时标签 |
| SubagentTool 卡 | **已有** | nux-subagent-track 四态 + ACTIVITY 进度行 |
| BashTool/SearchTool/McpTool 专用工具卡 | **判留** | nux-tool-call 通用三态卡已覆盖；专用卡在工具名 few 时收益低，待具体业务窗 |
| MultiFileDiff（逐文件多 diff） | **已采纳**（形态并入） | nux-diff-review 的 files[] 天然多文件 |
| agno References / 多模态消息（图/音/视频） | **已有** | msg.references + nux-citations；多媒体 attachments（默认关，11-11 稿判定维持） |
| ag-ui STATE_SNAPSHOT/STATE_DELTA | **判留**（维持上轮「显式不做」） | 越呈现层界；nexus 正道=ACTIVITY_* |
| ag-ui MESSAGES_SNAPSHOT / 二进制 wire | **判留** | 会话恢复属应用层 |

## 本轮交付锚

- 三新原语：js/components/nux-diff-review.js / nux-plan-card.js / nux-run-telemetry.js（各 <400 行，IIFE + window.Nux* + registry 三行 + insight CSS 段）
- 契约面：contract/nexus-ui.contract.json（78 组件 props/emits/statics + 34 工具脚本导出面 + 29 路由事件）+ contract/ai-events.schema.json + scripts/gen_ai_contract.py（--check 门禁）
- llms.txt：硬约束声明五条 / 接线配方（sendHandler 方言 → routeRichEvent 三行）/ 手工索引纠偏 65→78 + 10 缺件补录 / GENERATED 机读索引区块 / clarify-card、voice-realtime、nexus-subagent 数据层补档
- 零改动面：nux-ai-widgets 分发器（事件翻译进白名单动词）、AG-UI 事件词表（新件走 CUSTOM 约定键）、feat 默认值（不翻转，用户拍板）、nexus-stream.js 传输语义（S218 流式供料轮正交规避）

## 登记触发器（未做，非本轮债）

1. **专用工具卡族**：单一业务工具调用占比 >40% 的仓出现时，按 BashTool 模式出专用卡
2. **skill 分发面**：契约面被 3+ 仓 AI 助手实际消费后，评估沉淀 .zcode skill（agent-elements SKILL.md 同构）
3. **diff 渲染升级**：diff 原文 >500 行/文件的消费场景出现时，评估虚拟滚动
4. **nexus.tasks 长任务原语**：docs/nexus-tasks-contract-draft-2026-10-29.md 契约稿仍待拍板，与 nux-plan-card 天然衔接（plan 卡做呈现、tasks 做状态源）
