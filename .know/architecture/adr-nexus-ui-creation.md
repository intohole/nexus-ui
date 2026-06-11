---
id: adr-nexus-ui-creation
title: 创建nexus-ui统一前端基础设施工程
summary: 将分散在15+项目中的nexus-design/themes/mobile CSS和公共JS抽象为独立工程，通过jsDelivr GitHub CDN分发，各项目只需1行CDN引用
type: architecture
project: nexus-ui
date: 2026-06-11
tags: [architecture, design]
scope: project
related: []
---

# 创建nexus-ui统一前端基础设施工程

## 背景
15+项目各自维护nexus-design.css/nexus-themes.css副本，版本漂移不可避免，维护成本O(n)

## 方案对比
| 方案 | 优点 | 缺点 |
|------|------|------|
| A: CDN引用 | 版本管理清晰、零拷贝 | 需要Git仓库+CDN |
| B: Git Submodule | 本地开发方便 | 操作繁琐 |
| C: 相对路径引用 | 最简单 | 依赖部署配置 |

## 决策
选择方案A（jsDelivr GitHub CDN），理由：
1. 版本管理通过git tag，升级只需改版本号
2. CDN自动缓存和全球分发
3. 零构建、零编译，符合Vue 3 CDN技术栈

## 工程结构
- css/: nexus-design.css + nexus-themes.css + nexus-mobile.css + nexus-components.css + nexus-all.css
- js/: nexus-api.js + nexus-utils.js + nexus-store.js + user-center-sdk.js
- js/components/: nux-toast/modal/drawer/empty
- js/composables/: use-mobile/use-loading

## 影响范围
所有15+前端项目，CDN URL: https://cdn.jsdelivr.net/gh/intohole/nexus-ui@v1.0.1/css/nexus-all.css
