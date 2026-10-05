# Nexus UI

统一前端基础设施与设计系统工程，为全工作区所有应用提供设计规范、移动端适配、通用组件与工具函数。

## 项目简介

Nexus UI（Nexus Design System）是一套基于 Vue 3 CDN 全局模式的前端基础设施，以「引入即用、零构建」为目标，为各业务项目提供统一的设计令牌、布局、组件与 API 调用层。它同时是公共依赖版本清单（deps.json）的唯一事实来源，用于保证全工作区 CDN 库版本一致、浏览器缓存共享。

## 核心特性

- 设计令牌与主题：CSS 变量定义颜色/间距/圆角/阴影，内置 27 套应用特色色主题与暗色模式
- 移动端优先：dvh、安全区域、抽屉、触摸优化等移动端基础设施
- 布局骨架：`--nxs-header-h` 单源顶栏高度（自动叠加安全区），header/aside/main/topnav-drawer 全联动；z-index 全令牌化（`--nx-z-*` 阶梯）
- 通用 API 客户端：重试、超时、取消、401 处理、CRUD、文件上传/下载、SSE 流式 POST
- 组件库：nux-* 前缀的 Vue 组件（Toast/Modal/Drawer/Table/FormGroup/RadarChart/Checkin/拍照识别等）
- Composables：use-mobile/use-theme/use-recent 组合式函数
- AI 对话支持：统一 Markdown 渲染、ChatController 流式工具集、完整 nux-ai-chat 组件
- 版本一致性校验：check_deps.py 扫描全工作区，确保公共库版本统一

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3.4.21 | CDN 全局模式（非 ES Module），挂载到 window |
| UI | element-plus 2.6.1 | 可选，按需引入 |
| HTTP | axios 1.6.8 | 经 nexus-api.js 封装统出 |
| 基础设施 | nexus-ui | 本工程，CDN 分发，当前版本 v2.47.0 |
| 渲染 | marked + DOMPurify + hljs | Markdown 安全渲染 |

## 快速开始 / 使用方式

### 公共库统一版本

全工作区线上应用统一引用的公共 CDN 库版本以 `deps.json` 为唯一事实来源。当前统一版本：Vue=3.4.21、element-plus=2.6.1、axios=1.6.8、nexus-ui=2.47.0。新增/升级公共库版本必须先更新 `deps.json`，再统一同步所有项目，禁止只改单个项目。

### CSS 引入（HTML head）

> 分发主源为 `https://songguokr.com/nexus-ui/v<版本>/`（版本化 URL 是前缀重写，始终指向当前最新版）。下方以 jsDelivr 镜像为例，镜像依赖 GitHub tag，若 tag 缺失请改用主源。

```html
<link rel="stylesheet" href="https://songguokr.com/nexus-ui/v2.47.5/css/nexus-all.css">
```

### JS 引入（Vue 3 之后，基础工具最先引入）

```html
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/nexus-utils.js"></script>
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/nexus-api.js"></script>
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/nexus-crud.js"></script>
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/nexus-store.js"></script>
```

### 主题切换

在 `<body>` 标签上添加应用 class 即可切换特色色：

```html
<body class="app-one-note">   <!-- 青色 #14b8a6 -->
<body class="app-mini-deploy"> <!-- 部署平台主题 -->
```

暗色模式：`document.documentElement.setAttribute('data-theme', 'dark')`，或使用 `useTheme` composable。

### 核心 API 示例

```javascript
const api = new NexusApi({ baseUrl: '/api/v1', tokenKey: 'token' });
await api.get('/notes');
await api.createCrud('/notes'); // 返回 create/list/get/update/delete

const store = new NexusStore({ notes: [] }, { persistKeys: ['token', 'user'] });

// 组件注册（统一入口，禁止逐个 app.component）
NexusComponents.register(app);
// 非组件能力：nexus-all.js 已提供 window.showToast / window.nuxConfirm / window.showUnlock
```

### 版本一致性校验

```bash
python3 nexus-ui/check_deps.py [工作区根目录]
```

扫描全工作区，公共库版本与 deps.json 不一致即报错并返回非零退出码。

## 成就解锁与空状态引导组件

成就解锁由 `nexus-overlay-host.js` 内置提供（`nexus-all.js` 已聚合，无需单独引脚本、无需注册组件）：

```html
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/nexus-overlay-host.js"></script>
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/components/nux-empty-state.js"></script>
```

```javascript
window.showUnlock({ icon: '🏆', title: '首次点亮', desc: '完成第一个里程碑' }); // 成就解锁庆祝卡片

app.component('nux-empty-state', window.NuxEmptyState); // 或直接用 NexusComponents.register(app)
```

```html
<nux-empty-state icon="📚" title="还没有收藏的知识" description="..." hint="..."
    primary-text="去逛逛" secondary-text="使用指南" @primary="fn" @secondary="fn">
</nux-empty-state>
```

## 复制文本统一出口（copyText）

统一「复制 + 反馈提示」，替代各项目在复制按钮上各自手写 `navigator.clipboard` + execCommand 回退 + “已复制” toast 的重复逻辑。底层复用 `NexusUtils.copyToClipboard`（内置 execCommand 回退）。

```javascript
await NexusUtils.copyText(text);                                    // 复制成功，无提示
await NexusUtils.copyText(text, { success: '链接已复制' });          // 成功提示
await NexusUtils.copyText(text, { success: '已复制', type: 'info' }); // 自定义提示类型
await NexusUtils.copyText(text, { success: '已复制', fail: '复制失败' }); // 失败提示
```

返回 `Promise<boolean>`，成功为 `true`；失败时可自行处理或传 `fail` 文案提示。

## 结构化结果渲染（NuxResultView + NexusStructured）

统一「AI/接口返回结构化数据 → 表格/键值对展示」，自动探测 `{data:[...]}` 数组为表格（带 summary）、纯键值对象为 KV 列表、其余回退原始 `pre`。替代过去各项目在工具调用结果里手写同一套 table/kv 渲染模板。

```html
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/nexus-structured.js"></script>
<script src="https://songguokr.com/nexus-ui/v2.47.5/js/components/nux-result-view.js"></script>
```

```javascript
app.component('nux-result-view', window.NuxResultView);
const st = window.NexusStructured.build(result); // {kind:'table'|'kv'|'raw', ...}
```

```html
<nux-result-view :struct="st"></nux-result-view>
```

工具函数：
- `NexusStructured.build(result)` → 探测并归一为 `{kind, ...}`。
- `NexusStructured.format(result)` → 格式化兜底文本（对应旧 `formatResult`）。
- `NexusStructured.isError(result)` → 是否为错误对象（含 `error` 字段）。

## 项目结构

```
nexus-ui/
├── css/
│   ├── nexus-all.css           # 一键引入聚合包
│   ├── nexus-base.css          # 基础样式（重置/排版/按钮/表单）
│   └── nexus-chat.css          # 对话区域样式
├── js/
│   ├── nexus-utils.js          # 工具函数（formatDate/debounce 等）
│   ├── nexus-api.js            # API 客户端（重试/超时/CRUD/SSE）
│   ├── nexus-api-error.js      # API 错误类与中文翻译
│   ├── nexus-crud.js           # 通用 CRUD 工厂与 useCrud
│   ├── nexus-markdown.js       # Markdown 安全渲染
│   ├── nexus-chat.js           # AI 对话工具集
│   ├── nexus-store.js          # Vue 3 响应式持久化状态
│   ├── nexus-mobile.js         # 移动端基础设施
│   ├── nexus-validators.js     # 表单验证器
│   ├── user-center-sdk.js      # 用户中心 SDK
│   ├── components/             # nux-* Vue 组件
│   └── composables/            # use-* 组合式函数
├── deps.json                   # 公共库版本统一清单（唯一事实来源）
├── check_deps.py               # 全工作区版本一致性校验
└── package.json
```

## 服务依赖 / 集成

- 被全工作区各业务项目（oneNote、WisePath、aiPet、goldenStock、usercenter 等）通过 CDN 引用
- 依赖的外部 CDN 库：Vue、element-plus、axios、marked、DOMPurify、hljs
- 用户中心 SDK 与 usercenter 后端配套使用

## 部署

本工程为纯静态资源，主分发源为 songguokr.com（版本化 URL 前缀重写到当前根），代码经 GitHub（`intohole/nexus-ui`）镜像，push main 后由 miniDeploy 自动部署。发布新版本时更新 `package.json` 与 `deps.json`，再全工作区同步各项目引用 URL 与指纹（`sync_asset_hash.py --fix`）。

## 许可证

MIT License