/* global feedback float — 全应用反馈入口：右下角浮标 + 微表单 + 我的反馈回音
 * 提交走 userFeedback UC 轨（/api/v1/uc/feedbacks，身份由 UC 令牌决定），
 * 上下文自动附带（应用名/页面/console 最近报错环），未注册应用由服务端自动建档。
 * 支撑层（报错环/环境/API/纯工具）在 NexusFeedbackFloatHelpers，样式在 css/nexus-feedback-float.css。
 * 退出：window.NEXUS_FEEDBACK_DISABLED = true 或 localStorage.nux_feedback_float = 'off'
 */
(function() {
    'use strict';
    if (window.NexusFeedbackFloat) return;

    var H = window.NexusFeedbackFloatHelpers || {};
    var ROOT_ID = 'nux-feedback-root';
    var MAX_FAILURES = 3;

    var STATUS = {
        PENDING: { label: '待处理', cls: 'nxfb-tag--muted' },
        PROCESSING: { label: '处理中', cls: 'nxfb-tag--info' },
        RESOLVED: { label: '已解决', cls: 'nxfb-tag--ok' },
        CLOSED: { label: '已关闭', cls: 'nxfb-tag--muted' }
    };

    var state = { failures: 0, type: 'bug', ctx: true, tab: 'compose', open: false, lastFocus: null, unreadEcho: 0 };

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
        btn.style.position = 'relative';
        btn.setAttribute('aria-label', '提交反馈');
        btn.addEventListener('click', openPanel);
        root.appendChild(btn);
        document.body.appendChild(root);
        avoidCollisions(root);
        refreshEchoBadge();
    }

    /* ---------- 未读回音徽标（r5 挂账：unread-count 原语的首个浮标消费方） ---------- */
    function echoBadgeEl() {
        var btn = document.querySelector('#' + ROOT_ID + ' .nxfb-btn');
        return btn ? btn.querySelector('.nxfb-badge') : null;
    }

    function renderEchoBadge() {
        var btn = document.querySelector('#' + ROOT_ID + ' .nxfb-btn');
        if (!btn) return;
        var badge = echoBadgeEl();
        if (state.unreadEcho > 0) {
            if (!badge) {
                badge = el('span', 'nxfb-badge');
                btn.appendChild(badge);
            }
            badge.textContent = state.unreadEcho > 9 ? '9+' : String(state.unreadEcho);
            btn.setAttribute('aria-label', '反馈（有 ' + state.unreadEcho + ' 条新回音）');
        } else if (badge) {
            badge.remove();
            btn.setAttribute('aria-label', '提交反馈');
        }
    }

    function refreshEchoBadge() {
        if (!H.token || !H.token() || window.NexusFeedbackFloatStopped) return;
        fetch(H.API_BASE + '/api/v1/uc/echo/unread-count', {
            headers: { 'Authorization': 'Bearer ' + H.token() }
        }).then(function(resp) { return resp.ok ? resp.json() : null; }).then(function(wrapper) {
            var data = wrapper && wrapper.data ? wrapper.data : {};
            state.unreadEcho = Number(data.count || 0);
            renderEchoBadge();
        }).catch(function() {});
    }

    function clearEchoBadge() {
        state.unreadEcho = 0;
        renderEchoBadge();
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

    /* ---------- 面板 ---------- */
    function openPanel() {
        if (state.open) return;
        state.open = true;
        state.lastFocus = document.activeElement;
        state.tab = 'compose';
        state.failures = 0;
        if (state.unreadEcho > 0) clearEchoBadge();

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
        refreshEchoBadge();
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
        (H.TYPES || []).forEach(function(t) {
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
            '附带环境信息（' + (H.appLabel ? H.appLabel() : '') + ' · 当前页面 · 最近报错）'));

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
            var t = H.token ? H.token() : '';
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
            H.submitFeedback(content, { type: state.type, withCtx: state.ctx }).then(function(fb) {
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
        go.href = H.loginUrl ? H.loginUrl() : '/login.html';
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
        H.listMine().then(function(items) {
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
                window.open(H.API_BASE + '/', '_blank');
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
        var metaBits = [H.fmtDate(item.created_at), H.appLabelOf(item)];
        if (item.unread_echo) {
            metaBits.push('<span class="nxfb-newecho">新回音</span>');
        } else if (item.reply_count > 0) {
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
            window.open(H.API_BASE + '/?fid=' + item.id, '_blank');
        });
        return row;
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

    if (!(H.shouldSkipPage ? H.shouldSkipPage() : false)) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ensureButton);
        } else {
            ensureButton();
        }
    }
})();
