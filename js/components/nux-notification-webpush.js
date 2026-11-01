(function () {
    if (!window.NuxNotificationPanel) return;
    var DISMISS_KEY = 'nux_push_banner_dismissed_v1';

    function api() { return window.NexusUtils && NexusUtils.notify ? NexusUtils.notify.webpush : null; }

    function dismissed() {
        try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
    }
    function setDismissed() {
        try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    }

    function deniedNow(wp) {
        return wp.capability().ok && wp.permissionState() === 'denied';
    }

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
                'title="每日至多 ' + (state.dailyLimit || 12) + ' 条，重要通知直达系统通知。点击关闭"' +
                (self._pushBusy ? ' disabled' : '') + '>' +
                '<i class="fa-solid fa-bell"></i>' + (self._pushBusy ? '关闭中…' : '锁屏推送已开') + '</button>';
            return;
        }
        if (deniedNow(wp)) {
            host.innerHTML = '<button type="button" class="nux-notif-push-pill is-denied" data-push-recover ' +
                'title="通知权限已被拒绝，点击查看如何重新开启">' +
                '<i class="fa-solid fa-triangle-exclamation"></i>推送权限已关闭</button>';
            return;
        }
        host.innerHTML = '<button type="button" class="nux-notif-push-pill" data-push-toggle="on"' +
            (self._pushBusy ? ' disabled' : '') +
            ' title="开启后简报与提醒直达系统通知，每日至多 ' + (state.dailyLimit || 12) + ' 条">' +
            '<i class="fa-regular fa-bell"></i>' + (self._pushBusy ? '开启中…' : '开启锁屏推送') + '</button>';
    }

    function guideBanner(self, state) {
        return '<div class="nux-notif-push-banner" role="note">' +
            '<i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>' +
            '<span class="nux-notif-push-banner-text">简报与提醒直达系统锁屏，每日至多 ' + (state.dailyLimit || 12) + ' 条。</span>' +
            '<button type="button" class="nux-notif-push-banner-cta" data-push-toggle="on">开启</button>' +
            '<button type="button" class="nux-notif-push-banner-close" data-push-dismiss aria-label="不再提示">' +
            '<i class="fa-solid fa-xmark"></i></button></div>';
    }

    function recoverBanner() {
        return '<div class="nux-notif-push-banner is-recover" role="alert">' +
            '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>' +
            '<span class="nux-notif-push-banner-text">通知权限已被拒绝，需要到浏览器设置里手动允许：' +
            '打开浏览器设置 → 网站通知 → 找到本站选「允许」，回来再检测。</span>' +
            '<button type="button" class="nux-notif-push-banner-cta" data-push-recheck>重新检测</button></div>';
    }

    function renderBanner(self, state) {
        var host = self._container && self._container.querySelector('.nux-notif-push-banner-slot');
        if (!host) return;
        var wp = api();
        if (self._pushRecoverOpen) { host.innerHTML = recoverBanner(); return; }
        if (!state || !state.enabled || state.subscribed || dismissed() || !wp.capability().ok) {
            host.innerHTML = '';
            return;
        }
        host.innerHTML = guideBanner(self, state);
    }

    function renderFail(self, message) {
        var host = self._container && self._container.querySelector('.nux-notif-push-banner-slot');
        if (!host) return;
        host.innerHTML = '<div class="nux-notif-push-banner is-error" role="alert">' +
            '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>' +
            '<span class="nux-notif-push-banner-text">' + message + '</span>' +
            '<button type="button" class="nux-notif-push-banner-close" data-push-clear-error aria-label="知道了">' +
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
            if (e.target.closest('[data-push-recover]')) {
                e.stopPropagation();
                self._pushRecoverOpen = true;
                renderBanner(self, self._pushState);
                return;
            }
            if (e.target.closest('[data-push-recheck]')) {
                e.stopPropagation();
                self._pushRecoverOpen = false;
                self._refreshWebpush();
                return;
            }
            if (e.target.closest('[data-push-clear-error]')) {
                e.stopPropagation();
                var slot = self._container.querySelector('.nux-notif-push-banner-slot');
                if (slot) slot.innerHTML = '';
                return;
            }
            if (e.target.closest('[data-push-dismiss]')) {
                setDismissed();
                var slot2 = self._container.querySelector('.nux-notif-push-banner-slot');
                if (slot2) slot2.innerHTML = '';
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
        if (!cap.ok) { renderFail(self, self._esc(cap.reason)); return; }
        self._pushBusy = true;
        self._pushRecoverOpen = false;
        renderPill(self, self._pushState);
        wp.enable(self._getApi(), self._baseUrl).then(function () {
            return wp.sendTest(self._getApi(), self._baseUrl).catch(function () {});
        }).then(function () {
            self._pushBusy = false;
            if (window.showToast) window.showToast('已开启，测试推送已发出——请查看系统通知', 'success');
            self._refreshWebpush();
        }).catch(function (err) {
            self._pushBusy = false;
            var reason = (err && err.message) || '开启失败，请稍后重试';
            renderPill(self, self._pushState);
            renderFail(self, self._esc(reason));
            if (window.showToast) window.showToast(reason, 'error');
        });
    };

    proto._disableWebpush = function () {
        var self = this;
        var wp = api();
        if (!wp || self._pushBusy) return;
        self._pushBusy = true;
        renderPill(self, self._pushState);
        wp.disable(self._getApi(), self._baseUrl).then(function () {
            self._pushBusy = false;
            if (window.showToast) window.showToast('锁屏推送已关闭', 'info');
            self._refreshWebpush();
        }).catch(function () {
            self._pushBusy = false;
            renderPill(self, self._pushState);
            if (window.showToast) window.showToast('操作失败', 'error');
        });
    };
})();
