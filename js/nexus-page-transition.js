(function () {
    'use strict';

    const PT_VERSION = '1.0.0';

    // 浏览器 2026 基线（底稿 §二）：View Transitions same-doc 四核心齐备，
    // 但 QQ 14.9 / UC 15.5 内核不支持——渐进增强必配降级直跳。
    const WEAK_UA = /(QQBrowser|MQQBrowser|UCBrowser|UCWEB)/i;

    function uaBlocked() {
        try { return WEAK_UA.test(navigator.userAgent); } catch (e) { return false; }
    }

    function reducedMotion() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) { return false; }
    }

    function nativeSupported() {
        return typeof document.startViewTransition === 'function';
    }

    function supported() {
        return nativeSupported() && !uaBlocked() && !reducedMotion();
    }

    // 执行一次视图切换：supported 时包 startViewTransition（DOM 更新在回调里），
    // 否则直接同步执行回调（降级直跳，行为等价旧链）。reduced-motion 同样直跳。
    function transition(updateFn) {
        if (typeof updateFn !== 'function') return Promise.resolve();
        if (!supported()) {
            try { updateFn(); } catch (e) { return Promise.reject(e); }
            return Promise.resolve();
        }
        try {
            return Promise.resolve(document.startViewTransition(updateFn).finished);
        } catch (e) {
            try { updateFn(); } catch (e2) { return Promise.reject(e2); }
            return Promise.resolve();
        }
    }

    // 按名称定向切换（元素需设 view-transition-name）；name 传 null 清除。
    function nameOf(el, value) {
        if (!el) return;
        if (value) el.style.viewTransitionName = value;
        else el.style.removeProperty('view-transition-name');
    }

    // Vue 3 组合式便捷壳：与 nextTick 路由切换典型用法对齐。
    function vueTransition(routerFn) {
        return function wrapped() {
            return transition(function () {
                routerFn();
                return new Promise(function (resolve) {
                    if (window.Vue && Vue.nextTick) Vue.nextTick(resolve);
                    else resolve();
                });
            });
        };
    }

    window.NexusPageTransition = {
        version: PT_VERSION,
        supported: supported,
        nativeSupported: nativeSupported,
        transition: transition,
        nameOf: nameOf,
        vueTransition: vueTransition
    };
})();
