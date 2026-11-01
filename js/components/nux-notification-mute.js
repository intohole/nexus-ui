(function () {
    if (!window.NuxNotificationPanel) return;
    var proto = NuxNotificationPanel.prototype;
    proto._mutedApps = [];
    proto._muteOpen = false;
    proto._mutedLoaded = false;

    function renderMuteSection(self) {
        var host = self._container && self._container.querySelector('.nux-notif-mute-slot');
        if (!host || self._box !== 'inbox') { if (host) host.innerHTML = ''; return; }
        var apps = [];
        var seen = {};
        self._list.forEach(function (n) {
            var key = String(n.app_id || '').toLowerCase();
            if (key && !seen[key]) { seen[key] = true; apps.push(n.app_id); }
        });
        if (!apps.length) { host.innerHTML = ''; return; }
        var body = '';
        if (self._muteOpen) {
            body = '<div class="nux-notif-mute-list">' + apps.map(function (app) {
                var key = app.toLowerCase();
                var muted = self._mutedApps.indexOf(key) !== -1;
                return '<label class="nux-notif-mute-row"><span>' + self._esc(NexusUtils.notify.appLabel(app)) +
                    '</span><button type="button" class="nux-notif-mute-toggle' + (muted ? ' is-muted' : '') +
                    '" data-mute-app="' + self._esc(key) + '">' + (muted ? '已静音' : '接收中') + '</button></label>';
            }).join('') + '<p class="nux-notif-mute-hint">静音后不再接收该应用的新通知</p></div>';
        }
        host.innerHTML = '<button type="button" class="nux-notif-mute-head"><i class="fa-solid fa-sliders"></i>应用通知管理' +
            '<i class="fa-solid fa-chevron-' + (self._muteOpen ? 'up' : 'down') + '"></i></button>' + body;
    }

    var rawRender = proto._render;
    proto._render = function () {
        var out = rawRender.call(this);
        renderMuteSection(this);
        return out;
    };

    var rawMount = proto.mount;
    proto.mount = function (el) {
        var self = rawMount.call(this, el);
        var slot = el.querySelector('.nux-notif-mute-slot');
        if (!slot) return self;
        el.addEventListener('click', function (e) {
            if (e.target.closest('.nux-notif-mute-head')) {
                self._muteOpen = !self._muteOpen;
                if (self._muteOpen && !self._mutedLoaded) { loadMuted(self); return; }
                renderMuteSection(self);
                return;
            }
            var btn = e.target.closest('.nux-notif-mute-toggle');
            if (btn) toggleMute(self, btn.getAttribute('data-mute-app'));
        });
        return self;
    };

    function loadMuted(self) {
        self._getApi().get(self._baseUrl + '/app-preferences').then(function (d) {
            self._mutedApps = (d && d.muted_apps) || [];
            self._mutedLoaded = true;
            renderMuteSection(self);
        }).catch(function () { self._mutedLoaded = true; renderMuteSection(self); });
    }

    function toggleMute(self, appKey) {
        var muted = self._mutedApps.indexOf(appKey) === -1;
        self._getApi().put(self._baseUrl + '/app-preferences/' + encodeURIComponent(appKey), { muted: muted }).then(function () {
            if (muted) self._mutedApps.push(appKey);
            else self._mutedApps = self._mutedApps.filter(function (a) { return a !== appKey; });
            renderMuteSection(self);
        }).catch(function () {
            if (window.showToast) window.showToast('操作失败', 'error');
        });
    }
})();
