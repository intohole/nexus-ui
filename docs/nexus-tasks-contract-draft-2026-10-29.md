# nexus.tasks 长任务平台原语·契约稿（2026-10-29，S64 第 4 段）

> **状态：契约稿待拍板，落码另窗。** 本文是平台文档《大模型交互深度研究与体系化建设方案》（2026-10-27）§三 P1 批次「长任务平台原语」的落地契约草案。依据=S64 第 1 段四仓自建样板普查（out/s64/census.json `long_task_quads`）+ S51 后台任务终态契约（handoff/43）+ S32 G2 run contract（handoff/21 §六）。落码将动 nexus-backend（本轮避让区），拍板后开专属窗口。

## 一、为什么需要平台原语（四仓方言实锤）

| 仓 | register | progress | cancel | anchor | 粗糙度 |
|---|---|---|---|---|---|
| MiaoBi | 内存 JobManager（`miaobi_app/services/job_manager.py:28` start/resume/retry）+deck 增量落库 | AsyncIterator 事件流（`:95` _retry_partial 断点续跑样板） | **无显式取消端点**（SSE 断开即停） | deck 进度 UI（static/index.html:93） | 最好但孤岛 |
| moutain | research_task 表+`api/deepresearch_router.py:38` POST /tasks 返回 task_id | `:71` GET /tasks/{task_id} 轮询 | `core/background.py:22` | **对话页内轮询，无独立任务页** | 中 |
| verseCraft | GenerationTask 表（`app/db/database.py:65`） | 前端轮询+`app/main.py:87` recover_stale（F3 正面判例） | `app/services/task_manager.py:74` | 章节锚页（static/index.html:60） | 中 |
| LifeCompass | **无任务表**——mentor `send()` 同步阻塞式 LLM 长调用（`app/services/mentor_service.py:63`，平台文档§2.2「2 分钟纯转圈」） | 无 | 无 | 对话页内（S32 已补 run contract 承诺行） | 最粗糙 |

「任务注册/查询/进度事件/任务锚页面各仓自建」——同一语义四套方言，且 S32 G2 已在应用侧接了 6 面承诺行，平台侧注册/进度/取消/锚点原语从未立项。

## 二、五原语接口草案（nexus.tasks）

设计原则：**后端薄（注册+状态+事件转发），前端厚（统一任务卡组件）**；不替代各仓业务任务逻辑，只收编「任务生命周期表达」这一层。

### 2.1 注册 `nexus.tasks.register(spec) → task`

```python
# nexus-backend/nexus/tasks/registry.py（预估）
spec = {
    "kind": "deck_generation",        # 业务任务类型（展示名走 task_labels 表）
    "user_id": "uc:2",
    "promise": {"eta": "1-2 分钟", "deliver": "N 页 PPT 大纲+逐页讲稿"},  # G2 run contract 单源
    "progress_source": "sse" | "poll",  # 进度通道二选一
    "salvage": {"mode": "incremental" | "whole", "resume": True/False},   # G2 salvage 声明
}
task = {"task_id": "t_...", "status": "running", "created_at": ..., "promise": {...}}
```

### 2.2 查询 `GET /api/tasks/{task_id}` / `GET /api/tasks?mine=1`

状态机对齐 S51 终态封闭：`running → done | failed | cancelled`（+`stale` 由启动恢复判定）。响应带 `salvage` 视图（已生成 N/M、可保留部分）。

### 2.3 进度事件 `task_progress`（SSE，统一协议）

事件体对齐 routeRichEvent 语义层（nux-ai-chat-helpers.js:88）：

```json
{"type": "task_progress", "task_id": "t_...", "pct": 40, "stage": "生成第 3/8 页",
 "eta_left": "约 50 秒", "mid_result": {...}, "ts": "..."}
```

- routeRichEvent 增 `task_progress` 分支：msg.widgets 追加/更新 `task-card` 类型（widget_update 语义，S25 四态对齐）。
- 轮询型（moutain 形态）由前端 task-card 组件内轮询，对 UI 无差别。

### 2.4 取消 `POST /api/tasks/{task_id}/cancel`

语义：**协作式取消**（置 cancelled 标志，业务侧在检查点感知）；MiaoBi 断点续跑样板=cancel 后 salvage 保留（resume 可续）。取消后任务不删行——锚页可见「已取消，已保留 N/M」。

### 2.5 锚页面 `nux-task-card` 组件（nexus-ui）

- 消息内嵌形态（对话流中，替代「2 分钟纯转圈」）；任务列表形态（跨会话找回）。
- 承诺行持续可见（G2 规范 3：进行中不撤）；失败态答三问（已生成什么/能不能用/怎么办）+「保留/重来」双钮。
- 断线恢复：重进页面按 task_id 拉状态续显（不靠内存）。

## 三、与 S51/S32/G2 对齐表

| 契约条款 | nexus.tasks 承接方式 |
|---|---|
| S51 F1 静默丢失 | 注册即落库（重启不丢），异常终态必写 failed+原因 |
| S51 F2 重启蒸发 | 任务表持久化+startup `recover_stale`（verseCraft 判例直译） |
| S51 F3 僵尸 running | 启动恢复扫描：超时 running→stale/failed（带决策计量行） |
| S51 F4 假成功 | 终态写点单源收口（except 禁标 success，AST 守底已 fleet-wide） |
| S32 G2 run contract | spec.promise 单源（eta+deliver），task-card 承诺行消费 |
| S32 G2 salvage | spec.salvage 声明+查询响应 salvage 视图+失败态双钮 |

## 四、nexus-backend 改动面预估（落码另窗）

1. `nexus/tasks/`（新包）：registry（表+CRUD）、events（SSE 转发）、recover（启动扫描）——估 250-350 行；
2. 表 `platform_tasks`（幂等迁移，ensure_model_columns 配方）；索引 (user_id, created_at)；
3. 业务仓接入顺序建议：LifeCompass mentor 沙盘（最粗糙收益最大）→ moutain（已有表+轮询，薄适配）→ verseCraft（直替 GenerationTask 或桥接）→ MiaoBi（样板反向收编，收益=统一取消端点）；
4. nexus-ui `nux-task-card` 组件+routeRichEvent `task_progress` 分支；
5. 每接入一仓跑 S51 定罪器+G2 checklist 双验收。

## 五、待拍板清单

1. 任务表放各仓 DB 还是 nexus 侧集中表？（草案倾向集中：跨会话锚页+统一查询；各仓 salvage 数据仍在本仓，platform_tasks 存指针）
2. 进度通道默认：SSE 直发（MiaoBi 形态推广）vs 轮询兼容（moutain 存量）——草案=双通道由 spec 声明；
3. 旧任务表（moutain research_task / verseCraft GenerationTask）迁移策略：桥接共存 or 一次性直替；
4. 取消传播粒度：进程内 flag vs 任务表 status 字段轮询感知（分布式 worker 场景）。
