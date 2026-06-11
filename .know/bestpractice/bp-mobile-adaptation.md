---
id: bp-mobile-adaptation
type: bestpractice
title: "Vue 3 CDN项目移动端适配最佳实践"
summary: "使用dvh替代vh解决iOS Safari视口问题、env(safe-area-inset-bottom)适配iPhone安全区域、CSS变量--nx-vh做JS动态回退、44px最小触摸目标"
created: 2026-06-11
---

## 核心问题
1. iOS Safari的100vh包含地址栏高度，导致内容被裁切
2. iPhone X+底部安全区域未适配，导航栏被Home Indicator遮挡
3. 移动端弹窗固定宽度溢出
4. 侧边栏无移动端切换机制

## 解决方案
1. 使用dvh替代vh: `height: 100vh; height: 100dvh;` (渐进增强)
2. JS动态设置--nx-vh变量作为dvh的回退
3. 底部导航: `padding-bottom: env(safe-area-inset-bottom, 0px)`
4. Modal移动端: max-width: none; width: 100%; border-radius顶部圆角底部直角
5. 侧边栏: fixed定位 + translateX滑入/滑出 + 遮罩层
6. 触摸目标: `@media (hover: none) { min-height: 44px; font-size: 16px; }`
7. el-dialog移动端: width: 95%; label取消float

## 断点策略
- 480px: 小屏手机
- 768px: 平板/大屏手机（主断点）
- 1024px: 桌面
- 1200px: 大桌面

## 反例
- 硬编码100vh不做dvh回退 → iOS内容被裁切
- 弹窗固定width=560px → 手机上溢出
- 侧边栏仅缩窄到60px → 手机上不可用
