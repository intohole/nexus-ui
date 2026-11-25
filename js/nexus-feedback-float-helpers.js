/* NexusFeedbackFloatHelpers —— 反馈浮标支撑层（自 nexus-feedback-float.js 前21 拆出）
 * 职责：console 报错环 / 环境探测 / userFeedback UC 轨 API / 纯工具。
 * UI 与 DOM 归主文件；本文件不碰 DOM（除报错环监听）。
 */
(function() {
    'use strict';
    if (window.NexusFeedbackFloatHelpers) return;

    var API_BASE = String(window.NEXUS_FEEDBACK_BASE
        || (location.origin + '/userfeedback')).replace(/\/+$/, '');
    var MAX_CONSOLE = 8;

    var TYPES = [
        { key: 'bug', label: '问题' },
        { key: 'suggestion', label: '建议' },
        { key: 'feature', label: '功能' },
        { key: 'complaint', label: '投诉' },
        { key: 'inquiry', label: '咨询' },
        { key: 'other', label: '其他' }
    ];

    /* ---------- console 报错环（提交时随附，帮站长看到「现场」） ---------- */
    var ring = [];
    function pushRing(level, text) {
        ring.push({ level: level, text: String(text).slice(0, 200) });
        if (ring.length > MAX_CONSOLE) ring.shift();
    }
    (function installRing() {
        var origError = console.error, origWarn = console.warn;
        console.error = function() {
            try { pushRing('error', [].slice.call(arguments).join(' ')); } catch (e) {}
            return origError.apply(console, arguments);
        };
        console.warn = function() {
            try { pushRing('warn', [].slice.call(arguments).join(' ')); } catch (e) {}
            return origWarn.apply(console, arguments);
        };
        window.addEventListener('error', function(ev) {
            pushRing('error', (ev.message || 'script error') + ' @' + (ev.filename || '') + ':' + (ev.lineno || ''));
        });
        window.addEventListener('unhandledrejection', function(ev) {
            var r = ev && ev.reason;
            pushRing('error', 'unhandledrejection: ' + (r && r.message ? r.message : r));
        });
    })();

    /* ---------- 环境 ---------- */
    function appKey() {
        var seg = String(window.location.pathname || '').split('/')[1] || '';
        seg = seg.toLowerCase();
        return seg || 'portal';
    }
    function appLabel() {
        try {
            var label = window.NexusUtils && NexusUtils.notify
                ? NexusUtils.notify.appLabel(appKey()) : '';
            if (label) return label;
        } catch (e) {}
        var key = appKey();
        return key.charAt(0).toUpperCase() + key.slice(1);
    }
    function token() {
        try {
            if (window.NexusUtils && NexusUtils.authToken) return NexusUtils.authToken() || '';
        } catch (e) {}
        try {
            return sessionStorage.getItem('uc_access_token')
                || localStorage.getItem('uc_access_token') || '';
        } catch (e) { return ''; }
    }
    function shouldSkipPage() {
        if (window.NEXUS_FEEDBACK_DISABLED) return true;
        try {
            if (document.documentElement.getAttribute('data-nux-feedback') === 'off') return true;
            if (localStorage.getItem('nux_feedback_float') === 'off') return true;
        } catch (e) {}
        var path = window.location.pathname || '';
        if (path === '/' || path === '') return true;
        if (path.indexOf('/userfeedback') === 0) return true;
        if (/\/v2\.\d+\.\d+\//.test(path)) return true;
        return /user-center\.html$|portal\.html$|login\.html$|register\.html$/.test(path);
    }

    /* ---------- API ---------- */
    function contextMeta() {
        var meta = { app_name: appLabel(), page: window.location.pathname };
        try { meta.title = String(document.title || '').slice(0, 120); } catch (e) {}
        try { meta.viewport = window.innerWidth + 'x' + window.innerHeight; } catch (e) {}
        return meta;
    }

    /* opts: { type, withCtx } —— 类型与附带环境开关由宿主态传入（原闭包读主文件 state） */
    function submitFeedback(content, opts) {
        opts = opts || {};
        var type = opts.type || 'bug';
        var body = {
            title: content.split('\n')[0].slice(0, 40) || TYPES.filter(function(t) {
                return t.key === type;
            })[0].label,
            content: content,
            feedback_type: type,
            priority: 'medium',
            source: 'widget',
            app_key: appKey(),
            metadata: opts.withCtx
                ? Object.assign(contextMeta(), { console: ring.slice() })
                : contextMeta()
        };
        return fetch(API_BASE + '/api/v1/uc/feedbacks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token()
            },
            body: JSON.stringify(body)
        }).then(function(resp) {
            if (resp.status === 401) { var e = new Error('unauthorized'); e.status = 401; throw e; }
            if (!resp.ok) throw new Error('http-' + resp.status);
            return resp.json();
        }).then(function(wrapper) {
            var data = wrapper && wrapper.data ? wrapper.data : {};
            return data;
        });
    }

    function listMine() {
        return fetch(API_BASE + '/api/v1/uc/feedbacks?page_size=5', {
            headers: { 'Authorization': 'Bearer ' + token() }
        }).then(function(resp) {
            if (resp.status === 401) { var e = new Error('unauthorized'); e.status = 401; throw e; }
            if (!resp.ok) throw new Error('http-' + resp.status);
            return resp.json();
        }).then(function(wrapper) {
            var data = wrapper && wrapper.data ? wrapper.data : {};
            return Array.isArray(data.items) ? data.items : [];
        });
    }

    /* ---------- 纯工具 ---------- */
    function appLabelOf(item) {
        try {
            return (window.NexusUtils && NexusUtils.notify
                ? NexusUtils.notify.appLabel(item.app_key) : '') || item.app_key || '';
        } catch (e) { return item.app_key || ''; }
    }

    function fmtDate(value) {
        if (!value) return '';
        var d = new Date(value);
        if (isNaN(d.getTime())) return '';
        var now = new Date();
        var opt = { month: 'numeric', day: 'numeric' };
        if (d.getFullYear() !== now.getFullYear()) opt.year = 'numeric';
        return d.toLocaleDateString('zh-CN', opt);
    }

    function loginUrl() {
        var here = (window.location.pathname || '') + (window.location.search || '');
        return '/login.html?redirect=' + encodeURIComponent(here.replace(/^\/+/, '/'));
    }

    window.NexusFeedbackFloatHelpers = {
        API_BASE: API_BASE,
        TYPES: TYPES,
        appKey: appKey,
        appLabel: appLabel,
        token: token,
        shouldSkipPage: shouldSkipPage,
        contextMeta: contextMeta,
        submitFeedback: submitFeedback,
        listMine: listMine,
        appLabelOf: appLabelOf,
        fmtDate: fmtDate,
        loginUrl: loginUrl
    };
})();
