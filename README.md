# Nexus UI

统一前端基础设施与设计系统工程，为全工作区所有应用提供设计规范、移动端适配、通用组件与工具函数。

## 项目简介

Nexus UI（Nexus Design System）是一套基于 Vue 3 CDN 全局模式的前端基础设施，以「引入即用、零构建」为目标，为各业务项目提供统一的设计令牌、布局、组件与 API 调用层。它同时是公共依赖版本清单（deps.json）的唯一事实来源，用于保证全工作区 CDN 库版本一致、浏览器缓存共享。

## 核心特性

- 设计令牌与主题：CSS 变量定义颜色/间距/圆角/阴影，内置 24 个应用特色色主题与暗色模式
- 移动端优先：dvh、安全区域、抽屉、触摸优化等移动端基础设施
- 通用 API 客户端：重试、超时、取消、401 处理、CRUD、文件上传/下载、SSE 流式 POST
- 组件库：nux-* 前缀的 Vue 组件（Toast/Modal/Drawer/Table/FormGroup/RadarChart 等）
- Composables：use-pagination/use-crud/use-auth/use-theme/use-sse 等组合式函数
- AI 对话支持：统一 Markdown 渲染、ChatController 流式工具集、完整 nux-ai-chat 组件
- 版本一致性校验：check_deps.py 扫描全工作区，确保公共库版本统一

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3.4.21 | CDN 全局模式（非 ES Module），挂载到 window |
| UI | element-plus 2.6.1 | 可选，按需引入 |
| HTTP | axios 1.6.8 | 经 nexus-api.js 封装统出 |
| 基础设施 | nexus-ui | 本工程，CDN 分发，当前版本 v2.10.4 |
| 渲染 | marked + DOMPurify + hljs | Markdown 安全渲染 |

## 快速开始 / 使用方式

### 公共库统一版本

全工作区线上应用统一引用的公共 CDN 库版本以 `deps.json` 为唯一事实来源。当前统一版本：Vue=3.4.21、element-plus=2.6.1、axios=1.6.8、nexus-ui=2.10.1。新增/升级公共库版本必须先更新 `deps.json`，再统一同步所有项目，禁止只改单个项目。

### CSS 引入（HTML head）

```html
<link rel="stylesheet" href="https://cdn.jsdmirror.com/gh/intohole/nexus-ui@v2.10.1/css/nexus-all.css">
```

### JS 引入（Vue 3 之后，基础工具最先引入）

```html
<script src="https://cdn.jsdmirror.com/gh/intohole/nexus-ui@v2.10.1/js/nexus-utils.js"></script>
<script src="https://cdn.jsdmirror.com/gh/intohole/nexus-ui@v2.10.1/js/nexus-api.js"></script>
<script src="https://cdn.jsdmirror.com/gh/intohole/nexus-ui@v2.10.1/js/nexus-crud.js"></script>
<script src="https://cdn.jsdmirror.com/gh/intohole/nexus-ui@v2.10.1/js/nexus-store.js"></script>
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

// 组件注册
app.component('nux-toast', NuxToast);
app.component('nux-data-table', NuxDataTable);
```

### 版本一致性校验

```bash
python3 nexus-ui/check_deps.py [工作区根目录]
```

扫描全工作区，公共库版本与 deps.json 不一致即报错并返回非零退出码。

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
│   ├── user-center-api.js      # 用户中心管理 API
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

本工程为纯静态资源，通过 GitHub（`intohole/nexus-ui`）以 jsDelivr 镜像（`cdn.jsdmirror.com`）分发，无需部署服务器。发布新版本时更新 `package.json`、`deps.json` 与各项目引用 URL 并打 tag。

## 许可证

MIT License