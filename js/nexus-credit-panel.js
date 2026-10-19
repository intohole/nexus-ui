(function() {
    'use strict';
    if (window.NexusCreditPanel) return;

    var ROOT_ID = 'nux-credit-panel-root';
    var CARD_402_THROTTLE_MS = 4000;
    var last402At = 0;

    function ucBase() {
        return window.NEXUS_UC_BASE || '/uc-api';
    }

    function readToken() {
        return (window.NexusUtils && window.NexusUtils.authToken) ? window.NexusUtils.authToken() : '';
    }

    function api(method, path, body) {
        var token = readToken();
        if (!token) return Promise.reject(new Error('no-token'));
        var opts = {
            method: method,
            headers: { 'Authorization': 'Bearer ' + token },
            cache: 'no-store'
        };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch(ucBase() + path, opts).then(function(resp) {
            return resp.json().catch(function() { return {}; }).then(function(payload) {
                if (!resp.ok || payload.success === false) {
                    var detail = payload && payload.detail;
                    var msg = (detail && detail.message) || payload.message || ('http-' + resp.status);
                    var err = new Error(msg);
                    err.payload = detail || payload;
                    throw err;
                }
                return (payload && payload.data) || payload;
            });
        });
    }

    function esc(s) {
        return (window.NexusUtils && window.NexusUtils.escapeHtml)
            ? window.NexusUtils.escapeHtml(s)
            : String(s == null ? '' : s);
    }

    function fmt(n) {
        return typeof n === 'number' ? n.toLocaleString('zh-CN') : '…';
    }

    function injectStyles() {
        if (document.getElementById('nux-credit-panel-style')) return;
        var css = ''
            + '#' + ROOT_ID + '{position:fixed;left:16px;bottom:calc(64px + var(--nx-safe-bottom,0px));z-index:var(--nx-z-modal,1600);font-family:inherit;}'
            + '#nux-credit-402-root{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:var(--nx-z-modal,1600);'
            + 'width:min(400px,calc(100vw - 24px));font-family:inherit;}'
            + '.nxcp-card{background:var(--nx-bg-card,#fff);color:var(--nx-text-primary,#0f172a);border-radius:14px;'
            + 'box-shadow:0 12px 40px rgba(15,23,42,0.22);border:1px solid var(--nx-border,#e2e8f0);overflow:hidden;}'
            + '.nxcp-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 6px;}'
            + '.nxcp-head b{font-size:14px;}'
            + '.nxcp-mode{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--nx-bg-subtle,#f1f5f9);color:var(--nx-text-secondary,#475569);}'
            + '.nxcp-balance{display:flex;align-items:baseline;gap:8px;padding:2px 14px 10px;border-bottom:1px solid var(--nx-border,#e2e8f0);}'
            + '.nxcp-balance b{font-size:26px;font-variant-numeric:tabular-nums;}'
            + '.nxcp-balance span{font-size:12px;color:var(--nx-text-secondary,#64748b);}'
            + '.nxcp-od{font-size:11px;color:#d97706;background:rgba(251,191,36,0.14);border-radius:999px;padding:2px 8px;}'
            + '.nxcp-body{padding:10px 14px 12px;display:flex;flex-direction:column;gap:10px;}'
            + '.nxcp-checkin{display:flex;align-items:center;justify-content:space-between;gap:8px;}'
            + '.nxcp-checkin .nxcp-streak{font-size:12px;color:var(--nx-text-secondary,#64748b);}'
            + '.nxcp-checkin b{font-size:13px;}'
            + '.nxcp-btn{border:0;border-radius:8px;padding:7px 14px;font-size:13px;cursor:pointer;'
            + 'background:var(--nx-accent,#2563eb);color:#fff;transition:opacity .2s;}'
            + '.nxcp-btn:hover{opacity:.88;}'
            + '.nxcp-btn[disabled]{opacity:.5;cursor:default;}'
            + '.nxcp-btn.ghost{background:var(--nx-bg-subtle,#f1f5f9);color:var(--nx-text-primary,#0f172a);}'
            + '.nxcp-tasks{display:flex;flex-direction:column;gap:8px;}'
            + '.nxcp-task{display:flex;align-items:center;gap:10px;font-size:12px;}'
            + '.nxcp-task .t-title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
            + '.nxcp-task .t-bar{width:64px;height:5px;border-radius:3px;background:var(--nx-bg-subtle,#f1f5f9);overflow:hidden;flex:none;}'
            + '.nxcp-task .t-bar i{display:block;height:100%;background:var(--nx-accent,#2563eb);border-radius:3px;}'
            + '.nxcp-task .t-reward{color:#d97706;font-weight:600;flex:none;}'
            + '.nxcp-task .t-claim{border:0;background:none;color:var(--nx-accent,#2563eb);font-size:12px;cursor:pointer;padding:2px 4px;font-weight:600;}'
            + '.nxcp-foot{display:flex;justify-content:space-between;align-items:center;padding:8px 14px 12px;font-size:12px;}'
            + '.nxcp-foot a{color:var(--nx-accent,#2563eb);text-decoration:none;font-weight:600;}'
            + '.nxcp-close{border:0;background:none;cursor:pointer;font-size:16px;color:var(--nx-text-secondary,#64748b);line-height:1;padding:2px 4px;}'
            + '.nxcp-empty{font-size:12px;color:var(--nx-text-secondary,#64748b);}'
            + '#nux-credit-402-root .nxcp-402{padding:14px 16px;}'
            + '#nux-credit-402-root .nxcp-402 h4{margin:0 0 6px;font-size:14px;display:flex;align-items:center;gap:8px;}'
            + '#nux-credit-402-root .nxcp-402 p{margin:0 0 12px;font-size:12.5px;line-height:1.6;color:var(--nx-text-secondary,#475569);}'
            + '#nux-credit-402-root .nxcp-402-recovery{list-style:none;margin:0 0 12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;'
            + 'background:var(--nx-bg-subtle,#f1f5f9);border-radius:10px;font-size:12px;line-height:1.5;color:var(--nx-text-primary,#0f172a);}'
            + '#nux-credit-402-root .nxcp-402-recovery li{margin:0;}'
            + '.nxcp-lite{font-size:11px;color:#059669;background:rgba(16,185,129,0.12);border-radius:999px;padding:2px 8px;}'
            + '#nux-credit-402-root .nxcp-actions{display:flex;gap:8px;justify-content:flex-end;}'
            + '@media (max-width:640px){#' + ROOT_ID + '{left:10px;}}';
        var style = document.createElement('style');
        style.id = 'nux-credit-panel-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    var panelState = { visible: false, tasks: [], summary: null, busy: false, loaded: false };

    function ensurePanelDom() {
        var root = document.getElementById(ROOT_ID);
        if (root) return root;
        injectStyles();
        root = document.createElement('div');
        root.id = ROOT_ID;
        root.style.display = 'none';
        root.innerHTML = '<div class="nxcp-card" role="dialog" aria-label="积分面板">'
            + '<div class="nxcp-head"><b>我的积分</b>'
            + '<span style="display:flex;align-items:center;gap:8px"><span class="nxcp-mode">…</span>'
            + '<button type="button" class="nxcp-close" aria-label="关闭">✕</button></span></div>'
            + '<div class="nxcp-balance"><b class="nxcp-num">…</b><span>分</span><span class="nxcp-lite" style="display:none">轻量免费保障中</span><span class="nxcp-od" style="display:none"></span></div>'
            + '<div class="nxcp-body">'
            + '<div class="nxcp-checkin"><span class="nxcp-streak">每日签到</span><span style="display:flex;align-items:center;gap:8px">'
            + '<b class="nxcp-streak-num"></b><button type="button" class="nxcp-btn nxcp-checkin-btn">签到</button></span></div>'
            + '<div class="nxcp-tasks"></div></div>'
            + '<div class="nxcp-foot"><a href="/user-center.html#wallet">去钱包 →</a>'
            + '<span class="nxcp-empty">AI 调用按平台价扣积分，每日自动赠送</span></div></div>';
        document.body.appendChild(root);
        root.querySelector('.nxcp-close').addEventListener('click', close);
        root.querySelector('.nxcp-checkin-btn').addEventListener('click', doCheckin);
        document.addEventListener('click', function(ev) {
            if (!panelState.visible) return;
            var card = root.querySelector('.nxcp-card');
            if (root.contains(ev.target) || (ev.target.closest && ev.target.closest('#nux-credit-float-root'))) return;
            if (!card.contains(ev.target)) close();
        }, true);
        document.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape' && panelState.visible) close();
        });
        return root;
    }

    function render() {
        var root = document.getElementById(ROOT_ID);
        if (!root) return;
        var s = panelState.summary || {};
        var modeChip = root.querySelector('.nxcp-mode');
        var mode = s.charge_mode || '';
        modeChip.textContent = { trial: '体验期', formal: '正式期', off: '免费期' }[mode] || '积分';
        root.querySelector('.nxcp-num').textContent = fmt(s.balance);
        var lg = s.lite_grace || {};
        var liteEl = root.querySelector('.nxcp-lite');
        if (lg.enabled) {
            liteEl.style.display = '';
            liteEl.title = '低档模型调用免费保障中（余额不足也不中断）';
        } else {
            liteEl.style.display = 'none';
        }
        var od = s.overdraft || {};
        var odEl = root.querySelector('.nxcp-od');
        if (od.used > 0) {
            odEl.style.display = '';
            odEl.textContent = '垫付中 ' + fmt(od.used) + '/' + (od.limit === null || od.limit === undefined ? '不限' : fmt(od.limit));
        } else {
            odEl.style.display = 'none';
        }
        var checkin = null;
        for (var i = 0; i < panelState.tasks.length; i++) {
            if (panelState.tasks[i].metric === 'checkin') { checkin = panelState.tasks[i]; break; }
        }
        var streakNum = root.querySelector('.nxcp-streak-num');
        streakNum.textContent = checkin && checkin.streak ? '已连签 ' + checkin.streak + ' 天' : '';
        var btn = root.querySelector('.nxcp-checkin-btn');
        if (checkin && checkin.claimed) {
            btn.disabled = true;
            btn.textContent = '今日已签';
        } else {
            btn.disabled = panelState.busy;
            btn.textContent = checkin && checkin.reward_steps && checkin.streak !== undefined
                ? '签到 +' + (checkin.reward_steps[Math.min(checkin.streak || 0, checkin.reward_steps.length - 1)] || checkin.reward_points) : '签到';
        }
        var others = panelState.tasks.filter(function(t) {
            return t.metric !== 'checkin' && !t.claimed;
        }).slice(0, 3);
        var tasksEl = root.querySelector('.nxcp-tasks');
        if (!others.length) {
            tasksEl.innerHTML = '<div class="nxcp-empty">今日任务已完成，明天再来</div>';
        } else {
            tasksEl.innerHTML = others.map(function(t) {
                var pct = Math.min(100, Math.round((t.current / (t.target || 1)) * 100));
                return '<div class="nxcp-task"><span class="t-title">' + esc(t.title) + '</span>'
                    + '<span class="t-bar"><i style="width:' + pct + '%"></i></span>'
                    + '<span class="t-reward">+' + t.reward_points + '</span>'
                    + (t.done ? '<button type="button" class="t-claim" data-code="' + esc(t.code) + '">领取</button>'
                        : '<span class="nxcp-empty">' + t.current + '/' + t.target + '</span>') + '</div>';
            }).join('');
            tasksEl.querySelectorAll('.t-claim').forEach(function(b) {
                b.addEventListener('click', function() { doClaim(b.getAttribute('data-code')); });
            });
        }
    }

    function load() {
        return Promise.all([
            api('GET', '/api/points/summary'),
            api('GET', '/api/credits/tasks')
        ]).then(function(rs) {
            panelState.summary = rs[0];
            panelState.tasks = (rs[1] && rs[1].tasks) || [];
            panelState.loaded = true;
            render();
        });
    }

    function afterAction(text) {
        load().then(function() {
            if (window.NexusCreditFloat && window.NexusCreditFloat.refresh) window.NexusCreditFloat.refresh();
        });
        if (text && window.NexusUtils && window.NexusUtils.toast) {
            window.NexusUtils.toast(text, { type: 'success' });
        }
    }

    function doCheckin() {
        if (panelState.busy) return;
        panelState.busy = true;
        render();
        api('POST', '/api/credits/tasks/checkin').then(function(data) {
            panelState.busy = false;
            afterAction(data && data.reward ? '签到成功 +' + data.reward + ' 分' : '');
        }).catch(function() {
            panelState.busy = false;
            render();
        });
    }

    function doClaim(code) {
        if (!code) return;
        api('POST', '/api/credits/tasks/' + encodeURIComponent(code) + '/claim').then(function(data) {
            afterAction(data && data.reward_points ? '已领取 +' + data.reward_points + ' 分' : '');
        }).catch(function() {});
    }

    function open() {
        var root = ensurePanelDom();
        root.style.display = '';
        panelState.visible = true;
        if (!panelState.loaded) {
            load().catch(function() {
                root.querySelector('.nxcp-tasks').innerHTML =
                    '<div class="nxcp-empty">登录后可查看积分与任务</div>';
            });
        } else {
            load().catch(function() {});
        }
    }

    function close() {
        var root = document.getElementById(ROOT_ID);
        if (root) root.style.display = 'none';
        panelState.visible = false;
    }

    function ensure402Dom() {
        var root = document.getElementById('nux-credit-402-root');
        if (root) return root;
        injectStyles();
        root = document.createElement('div');
        root.id = 'nux-credit-402-root';
        root.style.display = 'none';
        root.innerHTML = '<div class="nxcp-card nxcp-402" role="alertdialog" aria-label="积分不足引导">'
            + '<h4><span aria-hidden="true">⚠️</span>积分余额不足</h4>'
            + '<p class="nxcp-402-msg"></p>'
            + '<ul class="nxcp-402-recovery"></ul>'
            + '<div class="nxcp-actions"><button type="button" class="nxcp-btn ghost nxcp-402-earn">去赚积分</button>'
            + '<button type="button" class="nxcp-btn nxcp-402-wallet">去钱包</button></div></div>';
        document.body.appendChild(root);
        root.querySelector('.nxcp-402-earn').addEventListener('click', function() {
            root.style.display = 'none';
            open();
        });
        root.querySelector('.nxcp-402-wallet').addEventListener('click', function() {
            var href = root.getAttribute('data-wallet') || '/user-center.html#wallet';
            try { window.location.href = href; } catch (e) {}
        });
        return root;
    }

    function recoveryLines(recovery, liteGrace, code) {
        var lines = [];
        if (recovery) {
            var ck = recovery.checkin;
            if (ck && ck.available && ck.next_reward > 0) {
                lines.push('✅ 现在签到可得 ' + ck.next_reward + ' 分'
                    + (ck.streak > 0 ? '（已连签 ' + ck.streak + ' 天）' : ''));
            }
            var ct = recovery.claimable_tasks;
            if (ct && ct.count > 0) {
                lines.push('✅ 有 ' + ct.count + ' 个任务已完成，可领 ' + ct.points + ' 分');
            }
            var gift = recovery.next_daily_gift;
            if (gift && gift.amount > 0) {
                lines.push('🕗 每日赠送 ' + gift.amount + ' 分' + (gift.note ? ' · ' + gift.note : ''));
            }
        }
        if (liteGrace && code === 'overdraft_limit') {
            lines.push('🪫 轻量模型仍可继续免费使用，高峰任务不受影响');
        }
        return lines;
    }

    function show402(detail) {
        var now = Date.now();
        if (now - last402At < CARD_402_THROTTLE_MS) return;
        last402At = now;
        var root = ensure402Dom();
        var code = detail.code || '';
        var odText = detail.overdraft && detail.overdraft.limit !== undefined
            ? '（体验授信 ' + fmt(detail.overdraft.used) + '/' + fmt(detail.overdraft.limit) + '）' : '';
        var msg;
        if (code === 'overdraft_limit') {
            msg = '今日免费体验额度已用完' + odText + '，赚积分或等每日赠送到账后可继续。';
        } else {
            msg = '当前余额 ' + fmt(typeof detail.balance === 'number' ? detail.balance : null) + ' 分'
                + (typeof detail.cost === 'number' ? '，本次需要 ' + detail.cost + ' 分' : '')
                + '。可以通过下面的方式马上补足：';
        }
        root.querySelector('.nxcp-402-msg').textContent = msg;
        var lines = recoveryLines(detail.recovery, detail.lite_grace === true, code);
        var ul = root.querySelector('.nxcp-402-recovery');
        ul.innerHTML = lines.map(function(t) { return '<li>' + esc(t) + '</li>'; }).join('');
        ul.style.display = lines.length ? '' : 'none';
        root.setAttribute('data-wallet', detail.wallet_url || '/user-center.html#wallet');
        root.style.display = '';
    }

    window.addEventListener('nexus:insufficient-credits', function(ev) {
        show402((ev && ev.detail) || {});
    });

    window.NexusCreditPanel = {
        open: open,
        close: close,
        show402: show402
    };
})();
