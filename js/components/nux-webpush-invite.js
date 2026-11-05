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
    var FAIL_COOLDOWN_DAYS = 3;
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

    function renderBar(host, text, onEnable, ctaLabel) {
        var bar = document.createElement('div');
        bar.id = 'nux-push-invite';
        bar.className = 'nux-push-invite';
        bar.setAttribute('role', 'note');
        bar.innerHTML =
            '<i class="fa-solid fa-mobile-screen nux-push-invite-ic" aria-hidden="true"></i>' +
            '<span class="nux-push-invite-text">' + text + '</span>' +
            '<button type="button" class="nux-push-invite-cta">' + (ctaLabel || '开启') + '</button>' +
            '<button type="button" class="nux-push-invite-close" aria-label="暂不开启">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
        bar.querySelector('.nux-push-invite-cta').addEventListener('click', function () {
            bar.classList.add('is-busy');
            var done = onEnable ? onEnable() : Promise.resolve();
            done.catch(function () {}).then(function () { removeBar(); });
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

    function dismissFor(days) {
        var s = readState();
        s.dismissedAt = Date.now() - (COOLDOWN_DAYS - days) * 86400000;
        writeState(s);
        removeBar();
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
            if (subs.some(function (x) { return x.enabled; })) {
                // 已有有效订阅：真已订阅，永久静默
                s.subscribedAt = s.subscribedAt || Date.now();
                writeState(s);
                return;
            }
            if (!d.enabled) {
                // 服务端通道未配置（VAPID 缺失等）：本次不出现且不落任何状态——
                // 误写 subscribedAt 会把邀请条永久静默，通道开通后老访客再无机会
                return;
            }
            // r25 可达性分型：服务端确认当前浏览器家族的 push service 不可达时，
            // 不再邀请点「开启」（原生订阅必败+3 次配额被失败耗尽=永久静默的撞墙链），
            // 换引导形态——教育 Safari/A2HS 通路，点了只记冷却，不触发订阅。
            var unreachable = !util.familyReachable(d);
            if (unreachable) {
                var seen = readState();
                seen.impressions = (seen.impressions || 0) + 1;
                writeState(seen);
                renderBar(
                    document.body,
                    '锁屏推送在当前浏览器的网络下不可达——用 <b>Safari</b> 打开本页即可一键开启（iPhone 需先「添加到主屏幕」）',
                    null,
                    '知道了'
                );
                // 「知道了」=短期冷却（3 天），通道可达性随网络变化，引导可再现
                var cta = document.querySelector('#nux-push-invite .nux-push-invite-cta');
                if (cta) cta.addEventListener('click', function () { dismissFor(FAIL_COOLDOWN_DAYS); });
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
                    }).catch(function () {
                        // 撞墙残余兜底（r25）：失败不白花曝光配额——回退 1 次曝光+短期冷却，
                        // 不再像 r24 时代 3 次失败即永久静默。
                        var rolled = readState();
                        rolled.impressions = Math.max(0, (rolled.impressions || 1) - 1);
                        rolled.dismissedAt = Date.now() - (COOLDOWN_DAYS - FAIL_COOLDOWN_DAYS) * 86400000;
                        writeState(rolled);
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
