/* nux-webpush-invite —— 锁屏推送页面级邀请条（r24）
 * r23 的订阅入口只存在于 bell/panel 打开之后，而生产实锤用户 5 天 0 打开 panel
 * ——鸡生蛋死锁。本组件零接线自挂载（进 nexus-all 全站生效），soft-ask 双段式：
 * 自有 UI 讲价值在先，用户点「开启」才触发浏览器原生权限弹窗（业界共识，
 * 防 Chrome 低接受率 quiet-UI 惩罚）。节奏克制：曝光 ≤3 次、dismiss 7 天冷却、
 * 每次加载至多 1 次、idle 4s 后出现、bell/panel 打开时让位。
 * 关停拨盘：页面置 window.NUX_PUSH_INVITE_DISABLED = true 即静默。 */
(function () {
    'use strict';
    if (window.NuxWebpushInvite) return;
    if (window.NUX_PUSH_INVITE_DISABLED) return;

    var STATE_KEY = 'nux_push_invite_state_v1';
    var IDLE_MS = 4000;
    var COOLDOWN_DAYS = 7;
    var MAX_IMPRESSIONS = 3;
    var API_BASES = ['/api/notify', '/notifycenter/api/notify'];

    function wp() { return window.NexusUtils && NexusUtils.notify ? NexusUtils.notify.webpush : null; }
    function readToken() {
        try {
            var store = NexusUtils.createDualStorage('uc_access_token');
            return store.getItem('uc_access_token') || '';
        } catch (e) { return ''; }
    }
    function readState() {
        try { return JSON.parse(window.localStorage.getItem(STATE_KEY) || '{}'); }
        catch (e) { return {}; }
    }
    function writeState(s) {
        try { window.localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {}
    }

    function tryBases(bases, token, path) {
        var i = 0;
        function next() {
            if (i >= bases.length) return Promise.reject(new Error('no base'));
            var base = bases[i++];
            return fetch(base + path, { headers: { 'Authorization': 'Bearer ' + token } })
                .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().then(function (d) { return { base: base, data: d }; }); })
                .catch(function () { return next(); });
        }
        return next();
    }

    function removeBar() {
        var el = document.getElementById('nux-push-invite');
        if (el) el.remove();
    }

    function renderBar(host, text, onEnable) {
        var bar = document.createElement('div');
        bar.id = 'nux-push-invite';
        bar.className = 'nux-push-invite';
        bar.setAttribute('role', 'note');
        bar.innerHTML =
            '<i class="fa-solid fa-mobile-screen nux-push-invite-ic" aria-hidden="true"></i>' +
            '<span class="nux-push-invite-text">' + text + '</span>' +
            '<button type="button" class="nux-push-invite-cta">开启</button>' +
            '<button type="button" class="nux-push-invite-close" aria-label="暂不开启">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
        bar.querySelector('.nux-push-invite-cta').addEventListener('click', function () {
            bar.classList.add('is-busy');
            onEnable().catch(function () {}).then(function () { removeBar(); });
        });
        bar.querySelector('.nux-push-invite-close').addEventListener('click', function () {
            var s = readState();
            s.dismissedAt = Date.now();
            writeState(s);
            removeBar();
        });
        host.appendChild(bar);
        requestAnimationFrame(function () { bar.classList.add('is-in'); });
    }

    function maybeInvite() {
        var util = wp();
        var token = readToken();
        if (!util || !token) return;
        if (document.getElementById('nux-push-invite')) return;
        if (document.querySelector('.nux-notify-panel')) return;

        var cap = util.capability();
        if (!cap.ok) return;
        var s = readState();
        if ((s.impressions || 0) >= MAX_IMPRESSIONS) return;
        if (s.dismissedAt && Date.now() - s.dismissedAt < COOLDOWN_DAYS * 86400000) return;
        if (s.subscribedAt) return;

        tryBases(API_BASES, token, '/webpush/status').then(function (st) {
            var d = st.data || {};
            var subs = Array.isArray(d.subscriptions) ? d.subscriptions : [];
            if (!d.enabled || subs.some(function (x) { return x.enabled; })) {
                s.subscribedAt = s.subscribedAt || Date.now();
                writeState(s);
                return;
            }
            return tryBases(API_BASES, token, '/notifications/box-summary').then(function (bs) {
                var boxes = (bs.data && bs.data.boxes) || [];
                var unread = 0;
                boxes.forEach(function (b) { if (b && b.box === 'action') unread = b.unread || 0; });
                var text = unread > 0
                    ? '你有 <b>' + unread + '</b> 件事待处理——开启锁屏推送，重要的事直达，不用来翻'
                    : '简报与提醒直达锁屏，每日至多 ' + (d.daily_limit || 12) + ' 条，不打扰';
                var seen = readState();
                seen.impressions = (seen.impressions || 0) + 1;
                writeState(seen);
                renderBar(document.body, text, function () {
                    var api = new NexusApi({ baseUrl: '', tokenKey: 'uc_access_token' });
                    return util.enable(api, st.base).then(function () {
                        return util.sendTest(api, st.base).catch(function () {});
                    }).then(function () {
                        var done = readState();
                        done.subscribedAt = Date.now();
                        writeState(done);
                        if (window.showToast) window.showToast('已开启，测试推送已发出——请查看系统通知', 'success');
                    });
                });
            });
        }).catch(function () {});
    }

    function start() {
        if (window.NUX_PUSH_INVITE_DISABLED) return;
        window.setTimeout(maybeInvite, IDLE_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.NuxWebpushInvite = { maybeInvite: maybeInvite, readState: readState };
})();
