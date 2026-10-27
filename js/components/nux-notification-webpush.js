/* nux-notification-webpush —— 锁屏推送开关（r23 渐进采纳装饰器）
 * 在 nux-notification-panel.js 之后加载：包装 panel.mount，向 header 注入
 * 「锁屏推送」开关、向收件箱注入一次性引导条。不加载本文件 panel 照旧。 */
(function () {
    if (!window.NuxNotificationPanel) return;
    var DISMISS_KEY = 'nux_push_banner_dismissed_v1';

    function api() { return window.NexusUtils && NexusUtils.notify ? NexusUtils.notify.webpush : null; }

    function renderPill(self, state) {
        var host = self._container && self._container.querySelector('.nux-notif-push-slot');
        if (!host) return;
        var wp = api();
        if (!state || !state.enabled) { host.innerHTML = ''; return; }
        if (!wp.capability().ok) {
            host.innerHTML = '<span class="nux-notif-push-pill is-unsupported" title="' + self._esc(wp.capability().reason) + '">' +
                '<i class="fa-solid fa-lock"></i>锁屏推送</span>';
            return;
        }
        if (state.subscribed) {
            host.innerHTML = '<button type="button" class="nux-notif-push-pill is-on" data-push-toggle="off" ' +
                'title="每日至多 ' + (state.dailyLimit || 12) + ' 条，重要通知直达系统通知。点击关闭">' +
                '<i class="fa-solid fa-bell"></i>锁屏推送已开</button>';
            return;
        }
        host.innerHTML = '<button type="button" class="nux-notif-push-pill" data-push-toggle="on" ' +
            'title="开启后简报与提醒直达系统通知，每日至多 ' + (state.dailyLimit || 12) + ' 条">' +
            '<i class="fa-regular fa-bell"></i>开启锁屏推送</button>';
    }

    function renderBanner(self, state) {
        var host = self._container && self._container.querySelector('.nux-notif-push-banner-slot');
        if (!host) return;
        var wp = api();
        var dismissed = false;
        try { dismissed = window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) {}
        if (!state || !state.enabled || state.subscribed || dismissed || !wp.capability().ok) {
            host.innerHTML = '';
            return;
        }
        host.innerHTML = '<div class="nux-notif-push-banner" role="note">' +
            '<i class="fa-solid fa-mobile-screen"></i>' +
            '<span class="nux-notif-push-banner-text">开启锁屏推送，简报与提醒直达系统通知，不用打开面板来翻。</span>' +
            '<button type="button" class="nux-notif-push-banner-cta" data-push-toggle="on">开启</button>' +
            '<button type="button" class="nux-notif-push-banner-close" data-push-dismiss aria-label="不再提示">' +
            '<i class="fa-solid fa-xmark"></i></button></div>';
    }

    var proto = NuxNotificationPanel.prototype;
    var rawMount = proto.mount;
    proto.mount = function (el) {
        var self = rawMount.call(this, el);
        var wp = api();
        if (!wp) return self;
        el.addEventListener('click', function (e) {
            var toggle = e.target.closest('[data-push-toggle]');
            if (toggle) {
                e.stopPropagation();
                return toggle.getAttribute('data-push-toggle') === 'on'
                    ? self._enableWebpush() : self._disableWebpush();
            }
            if (e.target.closest('[data-push-dismiss]')) {
                try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (err) {}
                var slot = self._container.querySelector('.nux-notif-push-banner-slot');
                if (slot) slot.innerHTML = '';
            }
        });
        self._refreshWebpush();
        return self;
    };

    proto._refreshWebpush = function () {
        var self = this;
        var wp = api();
        if (!wp || self._pushBusy) return;
        wp.status(self._getApi(), self._baseUrl).then(function (state) {
            self._pushState = state;
            renderPill(self, state);
            renderBanner(self, state);
        }).catch(function () {});
    };

    proto._enableWebpush = function () {
        var self = this;
        var wp = api();
        if (!wp || self._pushBusy) return;
        var cap = wp.capability();
        if (!cap.ok) {
            if (window.showToast) window.showToast(cap.reason, 'info');
            return;
        }
        self._pushBusy = true;
        wp.enable(self._getApi(), self._baseUrl).then(function () {
            return wp.sendTest(self._getApi(), self._baseUrl).catch(function () {});
        }).then(function () {
            self._pushBusy = false;
            if (window.showToast) window.showToast('已开启，测试推送已发出——请查看系统通知', 'success');
            self._refreshWebpush();
        }).catch(function (err) {
            self._pushBusy = false;
            if (window.showToast) window.showToast((err && err.message) || '开启失败，请稍后重试', 'error');
        });
    };

    proto._disableWebpush = function () {
        var self = this;
        var wp = api();
        if (!wp || self._pushBusy) return;
        self._pushBusy = true;
        wp.disable(self._getApi(), self._baseUrl).then(function () {
            self._pushBusy = false;
            if (window.showToast) window.showToast('锁屏推送已关闭', 'info');
            self._refreshWebpush();
        }).catch(function () {
            self._pushBusy = false;
            if (window.showToast) window.showToast('操作失败', 'error');
        });
    };
})();
