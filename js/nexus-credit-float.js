(function() {
    'use strict';
    if (window.NexusCreditFloat) return;

    var POLL_MS = 45000;
    var TOAST_THROTTLE_MS = 30000;
    var TOAST_STAY_MS = 3200;
    var LOW_BALANCE = 200;
    var MAX_FAILURES = 5;
    var REQUEST_TIMEOUT_MS = 8000;
    var ROOT_ID = 'nux-credit-float-root';
    var TOKEN_KEYS = ['uc_access_token', 'siwu_uc_access_token', 'uc_token'];

    function ucBase() {
        return window.NEXUS_UC_BASE || '/uc-api';
    }

    function readToken() {
        for (var i = 0; i < TOKEN_KEYS.length; i++) {
            try {
                var v = sessionStorage.getItem(TOKEN_KEYS[i]) || localStorage.getItem(TOKEN_KEYS[i]);
                if (v) return v;
            } catch (e) {}
        }
        return '';
    }

    function shouldSkipPage() {
        var path = window.location.pathname || '';
        return /user-center\.html$|portal\.html$|\/v2\.\d+\.\d+\//.test(path);
    }

    function injectStyles() {
        if (document.getElementById('nux-credit-float-style')) return;
        var css = ''
            + '#' + ROOT_ID + '{position:fixed;left:16px;bottom:16px;z-index:var(--nx-z-float,1500);font-family:inherit;user-select:none;}'
            + '#' + ROOT_ID + ' .nxcf-badge{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;'
            + 'background:rgba(15,23,42,0.78);color:#fff;font-size:13px;font-variant-numeric:tabular-nums;'
            + 'box-shadow:0 4px 16px rgba(15,23,42,0.25);cursor:pointer;border:1px solid rgba(255,255,255,0.14);'
            + 'transition:opacity .3s,transform .3s;opacity:.72;}'
            + '#' + ROOT_ID + ' .nxcf-badge:hover{opacity:1;transform:translateY(-1px);}'
            + '#' + ROOT_ID + ' .nxcf-badge.pulse{animation:nxcf-pulse .9s ease;}'
            + '#' + ROOT_ID + ' .nxcf-badge.credit{border-color:rgba(251,191,36,0.65);}'
            + '#' + ROOT_ID + ' .nxcf-badge svg{flex:none;}'
            + '#' + ROOT_ID + ' .nxcf-toast{position:absolute;left:0;bottom:44px;white-space:nowrap;padding:8px 14px;'
            + 'border-radius:10px;background:rgba(15,23,42,0.92);color:#fff;font-size:13px;'
            + 'box-shadow:0 6px 20px rgba(15,23,42,0.3);opacity:0;transform:translateY(6px);'
            + 'transition:opacity .25s,transform .25s;pointer-events:none;font-variant-numeric:tabular-nums;}'
            + '#' + ROOT_ID + ' .nxcf-toast.show{opacity:1;transform:translateY(0);}'
            + '#' + ROOT_ID + ' .nxcf-toast.warn{background:rgba(234,88,12,0.95);}'
            + '@keyframes nxcf-pulse{0%{box-shadow:0 0 0 0 rgba(56,189,248,0.55);}100%{box-shadow:0 0 0 14px rgba(56,189,248,0);}}'
            + '@media (max-width:640px){#' + ROOT_ID + '{left:10px;bottom:12px;}}';
        var style = document.createElement('style');
        style.id = 'nux-credit-float-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    var state = {
        balance: null,
        overdraftUsed: 0,
        overdraftLimit: null,
        overdraftExhausted: false,
        failures: 0,
        timer: null,
        lastToastAt: 0,
        pendingCost: 0,
        lowWarned: false,
        toastTimer: null
    };

    function ensureDom() {
        var root = document.getElementById(ROOT_ID);
        if (root) return root;
        injectStyles();
        root = document.createElement('div');
        root.id = ROOT_ID;
        root.innerHTML = ''
            + '<button type="button" class="nxcf-badge" title="积分余额（点击查看钱包）">'
            + '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fbbf24" stroke-width="2">'
            + '<circle cx="12" cy="12" r="9"></circle><path d="M8.5 9.5h7M8.5 14h7M12 7v10"></path></svg>'
            + '<span class="nxcf-num">…</span></button>'
            + '<div class="nxcf-toast" role="status"></div>';
        document.body.appendChild(root);
        root.querySelector('.nxcf-badge').addEventListener('click', openWallet);
        return root;
    }

    function badgeEl() {
        return document.querySelector('#' + ROOT_ID + ' .nxcf-badge');
    }

    function toastEl() {
        return document.querySelector('#' + ROOT_ID + ' .nxcf-toast');
    }

    function openWallet() {
        try {
            window.location.href = '/user-center.html#wallet';
        } catch (e) {}
    }

    function renderBalance() {
        var num = document.querySelector('#' + ROOT_ID + ' .nxcf-num');
        if (num && state.balance !== null) {
            num.textContent = state.balance.toLocaleString('zh-CN');
        }
        renderBadgeState();
    }

    function renderBadgeState() {
        var badge = badgeEl();
        if (!badge) return;
        var onCredit = state.overdraftUsed > 0;
        badge.classList.toggle('credit', onCredit);
        badge.title = onCredit ? '积分余额（体验授信垫付中，点击查看钱包）' : '积分余额（点击查看钱包）';
    }

    function pulse() {
        var badge = badgeEl();
        if (!badge) return;
        badge.classList.remove('pulse');
        void badge.offsetWidth;
        badge.classList.add('pulse');
    }

    function showToast(text, warn) {
        var el = toastEl();
        if (!el) return;
        el.textContent = text;
        el.classList.toggle('warn', !!warn);
        el.classList.add('show');
        if (state.toastTimer) clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(function() {
            el.classList.remove('show');
        }, TOAST_STAY_MS);
    }

    function flushCostToast(balance) {
        var now = Date.now();
        if (state.pendingCost <= 0) return;
        if (now - state.lastToastAt < TOAST_THROTTLE_MS) return;
        showToast('AI 调用消耗 ' + state.pendingCost + ' 积分 · 余额 ' + balance.toLocaleString('zh-CN'));
        state.pendingCost = 0;
        state.lastToastAt = now;
        warnIfLow(balance);
    }

    function flushCreditToast() {
        var now = Date.now();
        if (now - state.lastToastAt < TOAST_THROTTLE_MS) return;
        var limit = state.overdraftLimit === null ? '不限' : state.overdraftLimit.toLocaleString('zh-CN');
        showToast('AI 调用由平台垫付 · 累计 ' + state.overdraftUsed.toLocaleString('zh-CN') + '/' + limit, true);
        state.lastToastAt = now;
    }

    function warnIfLow(balance) {
        if (state.lowWarned || balance >= LOW_BALANCE) return;
        state.lowWarned = true;
        var formal = typeof state.chargeMode === 'string' && state.chargeMode === 'formal';
        if (!formal && state.overdraftExhausted) {
            showToast('免费体验额度已用完，每日赠送积分仍可正常使用', true);
            return;
        }
        showToast(formal ? '积分即将用完，余额不足将无法使用 AI 能力' : '积分即将用完，明日自动赠送 200 分', true);
    }

    function applySummary(data) {
        var prev = state.balance;
        var prevOverdraft = state.overdraftUsed;
        state.balance = typeof data.balance === 'number' ? data.balance : prev;
        state.chargeMode = data.charge_mode || state.chargeMode;
        var od = data.overdraft || {};
        state.overdraftUsed = typeof od.used === 'number' ? od.used : state.overdraftUsed;
        if (typeof od.limit === 'number') state.overdraftLimit = od.limit;
        else if ('limit' in od && od.limit === null) state.overdraftLimit = null;
        state.overdraftExhausted = !!od.exhausted;
        renderBalance();
        if (prev !== null && state.balance !== null && state.balance < prev) {
            state.pendingCost += prev - state.balance;
            pulse();
            flushCostToast(state.balance);
        } else if (prev !== null && state.balance > prev) {
            pulse();
        }
        if (state.overdraftUsed > prevOverdraft) {
            pulse();
            flushCreditToast();
        }
        if (state.balance !== null) warnIfLow(state.balance);
    }

    function fetchSummary() {
        var token = readToken();
        if (!token) return Promise.reject(new Error('no-token'));
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, REQUEST_TIMEOUT_MS);
        return fetch(ucBase() + '/api/points/summary', {
            headers: { 'Authorization': 'Bearer ' + token },
            cache: 'no-store',
            signal: controller.signal
        }).then(function(resp) {
            clearTimeout(timer);
            if (!resp.ok) throw new Error('http-' + resp.status);
            return resp.json();
        }).then(function(body) {
            var data = body && body.data ? body.data : body;
            if (!data || typeof data.balance !== 'number') throw new Error('bad-payload');
            return data;
        });
    }

    function refresh() {
        if (document.getElementById(ROOT_ID) && document.hidden) return;
        fetchSummary().then(function(data) {
            state.failures = 0;
            ensureDom();
            applySummary(data);
        }).catch(function() {
            state.failures += 1;
            if (state.failures >= MAX_FAILURES) stop();
        });
    }

    function start() {
        if (state.timer || window.NexusCreditFloatStopped) return;
        refresh();
        state.timer = setInterval(refresh, POLL_MS);
        document.addEventListener('visibilitychange', onVisibility);
    }

    function onVisibility() {
        if (!document.hidden) refresh();
    }

    function stop() {
        if (state.timer) clearInterval(state.timer);
        state.timer = null;
        document.removeEventListener('visibilitychange', onVisibility);
        var root = document.getElementById(ROOT_ID);
        if (root) root.remove();
    }

    window.NexusCreditFloat = {
        refresh: refresh,
        stop: stop,
        start: start,
        config: function(opts) {
            opts = opts || {};
            if (opts.hidden) stop();
        }
    };

    if (!shouldSkipPage() && (function() {
        try { return localStorage.getItem('nux_credit_float') !== 'off'; } catch (e) { return true; }
    })()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }
})();
