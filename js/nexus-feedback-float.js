/* global feedback float — 全应用反馈入口：右下角浮标 + 微表单 + 我的反馈回音
 * 提交走 userFeedback UC 轨（/api/v1/uc/feedbacks，身份由 UC 令牌决定），
 * 上下文自动附带（应用名/页面/console 最近报错环），未注册应用由服务端自动建档。
 * 退出：window.NEXUS_FEEDBACK_DISABLED = true 或 localStorage.nux_feedback_float = 'off'
 */
(function() {
    'use strict';
    if (window.NexusFeedbackFloat) return;

    var API_BASE = String(window.NEXUS_FEEDBACK_BASE
        || (location.origin + '/userfeedback')).replace(/\/+$/, '');
    var ROOT_ID = 'nux-feedback-root';
    var PANEL_Z = 1600;
    var MAX_CONSOLE = 8;
    var MAX_FAILURES = 3;

    var TYPES = [
        { key: 'bug', label: '问题' },
        { key: 'suggestion', label: '建议' },
        { key: 'feature', label: '功能' },
        { key: 'complaint', label: '投诉' },
        { key: 'inquiry', label: '咨询' },
        { key: 'other', label: '其他' }
    ];
    var STATUS = {
        PENDING: { label: '待处理', cls: 'nxfb-tag--muted' },
        PROCESSING: { label: '处理中', cls: 'nxfb-tag--info' },
        RESOLVED: { label: '已解决', cls: 'nxfb-tag--ok' },
        CLOSED: { label: '已关闭', cls: 'nxfb-tag--muted' }
    };

    var state = { failures: 0, type: 'bug', ctx: true, tab: 'compose', open: false, lastFocus: null };

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

    /* ---------- 样式 ---------- */
    function injectStyles() {
        if (document.getElementById('nux-feedback-style')) return;
        var style = document.createElement('style');
        style.id = 'nux-feedback-style';
        style.textContent = ''
            + '#' + ROOT_ID + '{position:fixed;right:16px;bottom:16px;z-index:var(--nx-z-float,1500);font-family:inherit;}'
            + '#' + ROOT_ID + '.nxfb-raised{bottom:76px;}'
            + '.nxfb-btn{display:flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;'
            + 'background:var(--nx-bg-elevated,#fff);color:var(--nx-text-body,#334155);'
            + 'border:1px solid var(--nx-border,#e2e8f0);box-shadow:var(--nx-shadow-lg,0 8px 24px rgba(0,0,0,.12));'
            + 'font-size:13px;cursor:pointer;transition:transform .15s,box-shadow .15s,opacity .2s;opacity:.88;}'
            + '.nxfb-btn:hover{opacity:1;transform:translateY(-1px);}'
            + '.nxfb-btn svg{flex:none;}'
            + '@media (max-width:768px){.nxfb-btn span{display:none;}.nxfb-btn{padding:0 11px;}}'
            + '.nxfb-mask{position:fixed;inset:0;z-index:var(--nx-z-float-panel,' + PANEL_Z + ');background:rgba(15,23,42,.42);'
            + 'display:flex;align-items:flex-end;justify-content:center;'
            + 'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}'
            + '@media (min-width:769px){.nxfb-mask{align-items:center;}}'
            + '.nxfb-panel{background:var(--nx-bg-elevated,#fff);color:var(--nx-text-body,#334155);'
            + 'border:1px solid var(--nx-border,#e2e8f0);border-radius:var(--nx-radius-lg,16px);'
            + 'box-shadow:var(--nx-shadow-lg,0 8px 24px rgba(0,0,0,.18));width:380px;max-width:calc(100vw - 24px);'
            + 'max-height:min(560px,calc(100vh - 32px));max-height:min(560px,calc(100dvh - 32px));display:flex;flex-direction:column;'
            + 'margin-bottom:max(8px,env(safe-area-inset-bottom));'
            + 'animation:nxfb-in .18s ease;}'
            + '@media (prefers-reduced-motion:reduce){.nxfb-panel{animation:none;}}'
            + '@keyframes nxfb-in{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;}}'
            + '.nxfb-head{display:flex;align-items:center;justify-content:space-between;'
            + 'padding:14px 16px 10px;}'
            + '.nxfb-title{font-size:15px;font-weight:600;color:var(--nx-text-heading,#0f172a);}'
            + '.nxfb-close{border:0;background:none;color:var(--nx-text-muted,#94a3b8);cursor:pointer;'
            + 'font-size:18px;line-height:1;padding:4px;border-radius:8px;}'
            + '.nxfb-close:hover{color:var(--nx-text-heading,#0f172a);}'
            + '.nxfb-tabs{display:flex;gap:4px;margin:0 16px 10px;padding:3px;'
            + 'background:var(--nx-bg-secondary,#f1f5f9);border-radius:10px;}'
            + '.nxfb-tab{flex:1;border:0;background:none;padding:6px 0;border-radius:8px;'
            + 'font-size:13px;color:var(--nx-text-secondary,#64748b);cursor:pointer;}'
            + '.nxfb-tab.is-on{background:var(--nx-bg-elevated,#fff);color:var(--nx-text-heading,#0f172a);'
            + 'box-shadow:0 1px 4px rgba(15,23,42,.12);font-weight:600;}'
            + '.nxfb-body{padding:0 16px 16px;overflow-y:auto;}'
            + '.nxfb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;}'
            + '.nxfb-chip{border:1px solid var(--nx-border,#e2e8f0);background:none;border-radius:999px;'
            + 'padding:5px 13px;font-size:13px;color:var(--nx-text-secondary,#64748b);cursor:pointer;}'
            + '.nxfb-chip.is-on{background:var(--nx-primary-soft,rgba(99,102,241,.12));'
            + 'border-color:var(--nx-primary,#6366f1);color:var(--nx-primary,#6366f1);font-weight:600;}'
            + '.nxfb-text{width:100%;box-sizing:border-box;min-height:110px;resize:vertical;'
            + 'border:1px solid var(--nx-border,#e2e8f0);border-radius:10px;padding:10px 12px;'
            + 'font-size:14px;font-family:inherit;color:var(--nx-text-body,#334155);'
            + 'background:var(--nx-bg-secondary,#f8fafc);line-height:1.5;}'
            + '.nxfb-text:focus{outline:2px solid var(--nx-primary,#6366f1);outline-offset:-1px;}'
            + '.nxfb-ctx{display:flex;align-items:center;gap:6px;margin:10px 0 2px;'
            + 'font-size:12px;color:var(--nx-text-muted,#94a3b8);cursor:pointer;}'
            + '.nxfb-ctx input{accent-color:var(--nx-primary,#6366f1);}'
            + '.nxfb-foot{display:flex;align-items:center;justify-content:space-between;'
            + 'gap:10px;margin-top:12px;}'
            + '.nxfb-hint{font-size:12px;color:var(--nx-text-muted,#94a3b8);min-width:0;}'
            + '.nxfb-send{flex:none;border:0;border-radius:10px;padding:9px 18px;font-size:14px;font-weight:600;'
            + 'background:var(--nx-primary,#6366f1);color:var(--nx-text-on-accent,#fff);cursor:pointer;}'
            + '.nxfb-send:disabled{opacity:.5;cursor:default;}'
            + '.nxfb-err{margin-top:8px;font-size:12px;color:#dc2626;display:none;}'
            + '.nxfb-login{text-align:center;padding:22px 8px 10px;}'
            + '.nxfb-login p{font-size:14px;color:var(--nx-text-secondary,#64748b);margin:0 0 14px;}'
            + '.nxfb-login a{display:inline-block;border-radius:10px;padding:9px 22px;font-size:14px;'
            + 'font-weight:600;text-decoration:none;'
            + 'background:var(--nx-primary,#6366f1);color:var(--nx-text-on-accent,#fff);}'
            + '.nxfb-ok{text-align:center;padding:26px 8px 14px;}'
            + '.nxfb-ok-icon{width:44px;height:44px;border-radius:999px;margin:0 auto 12px;'
            + 'display:flex;align-items:center;justify-content:center;'
            + 'background:var(--nx-primary-soft,rgba(99,102,241,.12));color:var(--nx-primary,#6366f1);}'
            + '.nxfb-ok h4{margin:0 0 6px;font-size:15px;color:var(--nx-text-heading,#0f172a);}'
            + '.nxfb-ok p{margin:0 0 16px;font-size:13px;color:var(--nx-text-secondary,#64748b);}'
            + '.nxfb-link{background:none;border:0;padding:0;font-size:13px;font-weight:600;'
            + 'color:var(--nx-primary,#6366f1);cursor:pointer;}'
            + '.nxfb-item{display:block;width:100%;text-align:left;border:0;background:none;'
            + 'padding:10px 2px;border-bottom:1px solid var(--nx-border,#e2e8f0);cursor:pointer;}'
            + '.nxfb-item:hover{background:var(--nx-bg-secondary,#f8fafc);}'
            + '.nxfb-item-top{display:flex;align-items:center;gap:8px;margin-bottom:4px;}'
            + '.nxfb-item-title{flex:1;min-width:0;font-size:13px;font-weight:600;'
            + 'color:var(--nx-text-heading,#0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
            + '.nxfb-tag{flex:none;font-size:11px;border-radius:999px;padding:2px 8px;}'
            + '.nxfb-tag--muted{background:var(--nx-bg-secondary,#f1f5f9);color:var(--nx-text-secondary,#64748b);}'
            + '.nxfb-tag--info{background:rgba(59,130,246,.14);color:#2563eb;}'
            + '.nxfb-tag--ok{background:rgba(16,185,129,.14);color:#059669;}'
            + '.nxfb-item-meta{font-size:12px;color:var(--nx-text-muted,#94a3b8);}'
            + '.nxfb-item-meta .nxfb-voice{color:var(--nx-primary,#6366f1);font-weight:600;}'
            + '.nxfb-empty{text-align:center;padding:26px 0;color:var(--nx-text-muted,#94a3b8);font-size:13px;}'
            + '.nxfb-list-loading{text-align:center;padding:20px 0;font-size:13px;'
            + 'color:var(--nx-text-muted,#94a3b8);}';
        document.head.appendChild(style);
    }

    /* ---------- DOM ---------- */
    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html !== undefined) node.innerHTML = html;
        return node;
    }
    function chatIcon() {
        return '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" '
            + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M17 10a7 7 0 0 1-7 7c-1.1 0-2.15-.25-3.08-.7L3 17.5l1.24-3.6A7 7 0 1 1 17 10z"/>'
            + '<path d="M7 9h6M7 12h4"/></svg>';
    }
    function checkIcon() {
        return '<svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" '
            + 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="m4.5 10.5 3.5 3.5 7.5-8"/></svg>';
    }

    function ensureButton() {
        if (document.getElementById(ROOT_ID)) return;
        var root = el('div');
        root.id = ROOT_ID;
        var btn = el('button', 'nxfb-btn',
            chatIcon() + '<span>反馈</span>');
        btn.type = 'button';
        btn.setAttribute('aria-label', '提交反馈');
        btn.addEventListener('click', openPanel);
        root.appendChild(btn);
        document.body.appendChild(root);
        avoidCollisions(root);
    }

    function avoidCollisions(root) {
        try {
            var backtop = document.querySelector('.nux-backtop');
            if (backtop && backtop.getBoundingClientRect().height > 0) {
                var cs = getComputedStyle(backtop);
                var bottom = parseFloat(cs.bottom || '16');
                if (bottom < 70) root.classList.add('nxfb-raised');
            }
        } catch (e) {}
    }

    function loginUrl() {
        var here = (window.location.pathname || '') + (window.location.search || '');
        return '/login.html?redirect=' + encodeURIComponent(here.replace(/^\/+/, '/'));
    }

    /* ---------- 面板 ---------- */
    function openPanel() {
        if (state.open) return;
        state.open = true;
        state.lastFocus = document.activeElement;
        state.tab = 'compose';
        state.failures = 0;

        var mask = el('div', 'nxfb-mask');
        mask.id = ROOT_ID + '-mask';
        var panel = el('div', 'nxfb-panel nx-sheet');
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', '提交反馈');

        var head = el('div', 'nxfb-head',
            '<div class="nxfb-title">反馈</div>');
        var close = el('button', 'nxfb-close', '✕');
        close.type = 'button';
        close.setAttribute('aria-label', '关闭');
        close.addEventListener('click', closePanel);
        head.appendChild(close);

        var tabs = el('div', 'nxfb-tabs');
        var tabCompose = el('button', 'nxfb-tab is-on', '提交');
        var tabMine = el('button', 'nxfb-tab', '我的反馈');
        tabCompose.type = tabMine.type = 'button';
        tabCompose.addEventListener('click', function() { switchTab('compose'); });
        tabMine.addEventListener('click', function() { switchTab('mine'); });
        tabs.appendChild(tabCompose);
        tabs.appendChild(tabMine);

        var body = el('div', 'nxfb-body');
        panel.appendChild(head);
        panel.appendChild(tabs);
        panel.appendChild(body);
        mask.appendChild(panel);
        mask.addEventListener('click', function(ev) { if (ev.target === mask) closePanel(); });
        document.body.appendChild(mask);
        state.panel = { mask: mask, body: body, tabCompose: tabCompose, tabMine: tabMine };
        document.addEventListener('keydown', onKeydown);
        renderCompose();
        tabCompose.focus();
    }

    function onKeydown(ev) {
        if (ev.key === 'Escape') closePanel();
    }

    function closePanel() {
        var mask = document.getElementById(ROOT_ID + '-mask');
        if (mask) mask.remove();
        state.open = false;
        state.panel = null;
        document.removeEventListener('keydown', onKeydown);
        if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
    }

    function switchTab(tab) {
        if (!state.panel) return;
        state.tab = tab;
        state.panel.tabCompose.classList.toggle('is-on', tab === 'compose');
        state.panel.tabMine.classList.toggle('is-on', tab === 'mine');
        if (tab === 'compose') renderCompose();
        else renderMine();
    }

    function renderCompose() {
        var body = state.panel.body;
        body.innerHTML = '';
        var chips = el('div', 'nxfb-chips');
        TYPES.forEach(function(t) {
            var chip = el('button', 'nxfb-chip' + (state.type === t.key ? ' is-on' : ''), t.label);
            chip.type = 'button';
            chip.addEventListener('click', function() {
                state.type = t.key;
                chips.querySelectorAll('.nxfb-chip').forEach(function(c) {
                    c.classList.remove('is-on');
                });
                chip.classList.add('is-on');
            });
            chips.appendChild(chip);
        });

        var text = el('textarea', 'nxfb-text');
        text.placeholder = '说说遇到了什么问题，或想改进什么…';
        text.maxLength = 2000;

        var ctxLabel = el('label', 'nxfb-ctx');
        var ctxCheck = el('input');
        ctxCheck.type = 'checkbox';
        ctxCheck.checked = state.ctx;
        ctxCheck.addEventListener('change', function() { state.ctx = ctxCheck.checked; });
        ctxLabel.appendChild(ctxCheck);
        ctxLabel.appendChild(document.createTextNode(
            '附带环境信息（' + appLabel() + ' · 当前页面 · 最近报错）'));

        var err = el('div', 'nxfb-err');

        var foot = el('div', 'nxfb-foot');
        var hint = el('div', 'nxfb-hint');
        var send = el('button', 'nxfb-send', '提交反馈');
        send.type = 'button';
        foot.appendChild(hint);
        foot.appendChild(send);

        body.appendChild(chips);
        body.appendChild(text);
        body.appendChild(ctxLabel);
        body.appendChild(err);
        body.appendChild(foot);

        function renderHint() {
            var t = token();
            hint.textContent = t ? '将以当前登录身份提交' : '登录后提交，才能收到回音';
        }
        renderHint();

        send.addEventListener('click', function() {
            var content = text.value.trim();
            if (!content) {
                err.textContent = '写点内容再提交吧';
                err.style.display = 'block';
                text.focus();
                return;
            }
            send.disabled = true;
            err.style.display = 'none';
            submitFeedback(content).then(function(fb) {
                renderSuccess(fb);
            }).catch(function(exc) {
                send.disabled = false;
                if (exc && exc.status === 401) {
                    renderLogin();
                    return;
                }
                state.failures += 1;
                err.textContent = '提交失败，稍后再试';
                err.style.display = 'block';
                if (state.failures >= MAX_FAILURES) stop();
            });
        });
        text.focus();
    }

    function renderLogin() {
        var body = state.panel.body;
        body.innerHTML = '';
        var wrap = el('div', 'nxfb-login');
        var p = el('p', null, '登录后提交反馈，处理进展会通知到你。');
        var go = el('a', null, '去登录');
        go.href = loginUrl();
        wrap.appendChild(p);
        wrap.appendChild(go);
        body.appendChild(wrap);
    }

    function renderSuccess(fb) {
        var body = state.panel.body;
        body.innerHTML = '';
        var wrap = el('div', 'nxfb-ok');
        var icon = el('div', 'nxfb-ok-icon', checkIcon());
        var title = el('h4', null, '已收到，编号 #' + (fb && fb.id ? fb.id : '—'));
        var desc = el('p', null, '有回音时会在通知里告诉你。');
        var mine = el('button', 'nxfb-link', '看看我的反馈');
        mine.type = 'button';
        mine.addEventListener('click', function() { switchTab('mine'); });
        wrap.appendChild(icon);
        wrap.appendChild(title);
        wrap.appendChild(desc);
        wrap.appendChild(mine);
        body.appendChild(wrap);
    }

    function renderMine() {
        var body = state.panel.body;
        body.innerHTML = '';
        body.appendChild(el('div', 'nxfb-list-loading', '加载中…'));
        listMine().then(function(items) {
            body.innerHTML = '';
            if (!items.length) {
                var empty = el('div', 'nxfb-empty', '还没有反馈记录');
                var first = el('button', 'nxfb-link', '写第一条');
                first.type = 'button';
                first.style.display = 'block';
                first.style.margin = '10px auto 0';
                first.addEventListener('click', function() { switchTab('compose'); });
                body.appendChild(empty);
                body.appendChild(first);
                return;
            }
            items.forEach(function(item) {
                body.appendChild(renderItem(item));
            });
            var more = el('button', 'nxfb-link', '到反馈中心看全部');
            more.type = 'button';
            more.style.display = 'block';
            more.style.margin = '12px auto 2px';
            more.addEventListener('click', function() {
                window.open(API_BASE + '/', '_blank');
            });
            body.appendChild(more);
        }).catch(function(exc) {
            body.innerHTML = '';
            if (exc && exc.status === 401) {
                renderLogin();
                return;
            }
            body.appendChild(el('div', 'nxfb-empty', '加载失败，稍后再试'));
        });
    }

    function renderItem(item) {
        var st = STATUS[item.status] || STATUS.PENDING;
        var row = el('button', 'nxfb-item');
        row.type = 'button';
        var title = String(item.title || '（无标题）');
        var metaBits = [fmtDate(item.created_at), appLabelOf(item)];
        if (item.reply_count > 0) {
            metaBits.push('<span class="nxfb-voice">有回音</span>');
        }
        row.innerHTML = ''
            + '<div class="nxfb-item-top">'
            + '<div class="nxfb-item-title"></div>'
            + '<span class="nxfb-tag ' + st.cls + '"></span>'
            + '</div>'
            + '<div class="nxfb-item-meta"></div>';
        row.querySelector('.nxfb-item-title').textContent = '#' + item.id + ' ' + title;
        row.querySelector('.nxfb-tag').textContent = st.label;
        row.querySelector('.nxfb-item-meta').innerHTML = metaBits.join(' · ');
        row.addEventListener('click', function() {
            window.open(API_BASE + '/?fid=' + item.id, '_blank');
        });
        return row;
    }

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

    /* ---------- API ---------- */
    function contextMeta() {
        var meta = { app_name: appLabel(), page: window.location.pathname };
        try { meta.title = String(document.title || '').slice(0, 120); } catch (e) {}
        try { meta.viewport = window.innerWidth + 'x' + window.innerHeight; } catch (e) {}
        return meta;
    }

    function submitFeedback(content) {
        var body = {
            title: content.split('\n')[0].slice(0, 40) || TYPES.filter(function(t) {
                return t.key === state.type;
            })[0].label,
            content: content,
            feedback_type: state.type,
            priority: 'medium',
            source: 'widget',
            app_key: appKey(),
            metadata: state.ctx
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

    function stop() {
        var root = document.getElementById(ROOT_ID);
        if (root) root.remove();
        closePanel();
        window.NexusFeedbackFloatStopped = true;
    }

    window.NexusFeedbackFloat = {
        open: openPanel,
        close: closePanel,
        stop: stop
    };

    if (!shouldSkipPage()) {
        injectStyles();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ensureButton);
        } else {
            ensureButton();
        }
    }
})();
