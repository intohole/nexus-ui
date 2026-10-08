/**
 * nux-notification-panel — 通知中心页（modal 弹层/嵌入页两用）。
 * 未读/全部筛选消费后端 is_read 参数；删除走行内两段式确认（3 秒超时还原）；
 * 深链跳转由 NexusUtils.notify 统一解析；data.jobs 渲染岗位迷你卡；
 * 支持按应用静音（宿主回调返回 true 时接管导航）。
 */
(function () {
    var TYPE_ICONS = {
        message: 'fa-regular fa-comment', comment: 'fa-regular fa-comment',
        order: 'fa-solid fa-cart-shopping', trade: 'fa-solid fa-cart-shopping',
        system: 'fa-solid fa-circle-info', alert: 'fa-solid fa-triangle-exclamation',
        follow: 'fa-solid fa-user-plus', like: 'fa-solid fa-heart',
        task: 'fa-solid fa-list-check', approval: 'fa-solid fa-file-signature',
        job_subscription: 'fa-solid fa-briefcase'
    };
    var TYPE_TONES = {
        message: 'info', comment: 'info', task: 'success',
        order: 'warning', trade: 'warning', alert: 'danger',
        approval: 'accent', follow: 'accent', like: 'accent',
        job_subscription: 'accent', system: 'neutral'
    };

    function NuxNotificationPanel(options) {
        options = options || {};
        this._baseUrl = options.baseUrl || '/api/notify';
        this._tokenKey = options.tokenKey || 'uc_access_token';
        this._list = [];
        this._total = 0;
        this._page = 1;
        this._pageSize = 20;
        this._loading = false;
        this._container = null;
        this._manager = options.manager || null;
        this._onNotificationClick = options.onNotificationClick || null;
        this._mutedApps = [];
        this._muteOpen = false;
        this._filter = 'all';
        this._unread = 0;
        this._confirmId = null;
        this._confirmTimer = null;
    }

    NuxNotificationPanel.prototype._icon = function (type) {
        return TYPE_ICONS[type] || 'fa-regular fa-bell';
    };

    NuxNotificationPanel.prototype._tone = function (type) {
        return TYPE_TONES[type] || 'neutral';
    };

    NuxNotificationPanel.prototype._time = function (ts) {
        if (!ts) return '';
        return window.NexusUtils ? NexusUtils.formatRelativeTime(ts) : '';
    };

    NuxNotificationPanel.prototype._summary = function (content) {
        if (!content) return '';
        return content.length > 80 ? content.substring(0, 80) + '...' : content;
    };

    NuxNotificationPanel.prototype._esc = function (v) {
        var d = document.createElement('div');
        d.textContent = String(v == null ? '' : v);
        return d.innerHTML;
    };

    NuxNotificationPanel.prototype._getApi = function () {
        if (!this._api) {
            this._api = new NexusApi({ baseUrl: '', tokenKey: this._tokenKey });
        }
        return this._api;
    };

    NuxNotificationPanel.prototype._refreshUnread = function () {
        var self = this;
        self._getApi().get(self._baseUrl + '/unread-count').then(function (d) {
            self._unread = d && typeof d.count === 'number' ? d.count : 0;
            self._renderUnreadPill();
        }).catch(function () {});
    };

    NuxNotificationPanel.prototype._renderUnreadPill = function () {
        if (!this._container) return;
        var pill = this._container.querySelector('.nux-notif-unread-pill');
        if (!pill) return;
        pill.textContent = this._unread > 0 ? this._unread + ' 条未读' : '已全部读完';
        pill.classList.toggle('has-unread', this._unread > 0);
        var markAll = this._container.querySelector('.nux-notif-panel-mark-all');
        if (markAll) markAll.style.display = (this._manager && this._unread > 0) ? '' : 'none';
    };

    NuxNotificationPanel.prototype.load = function (page) {
        var self = this;
        if (page) self._page = page;
        self._loading = true;
        self._clearConfirm();
        if (self._container) {
            var list = self._container.querySelector('.nux-notif-panel-list');
            if (list) list.innerHTML = '<div class="nux-notif-panel-loading"><span class="nx-spinner"></span></div>';
        }
        var params = { page: self._page, page_size: self._pageSize };
        if (self._filter === 'unread') params.is_read = 'false';
        return self._getApi().get(self._baseUrl + '/notifications', params).then(function (resp) {
            self._list = resp.items || [];
            self._total = resp.total || 0;
            self._loading = false;
            self._render();
            self._refreshUnread();
        }).catch(function () {
            self._loading = false;
            if (self._container) {
                var list = self._container.querySelector('.nux-notif-panel-list');
                if (list) list.innerHTML = '<div class="nux-notif-panel-error"><i class="fa-solid fa-triangle-exclamation"></i><span>加载失败</span></div>';
            }
        });
    };

    NuxNotificationPanel.prototype.setFilter = function (f) {
        if (this._filter === f) return;
        this._filter = f;
        this._syncSegButtons();
        this.load(1);
    };

    NuxNotificationPanel.prototype._syncSegButtons = function () {
        if (!this._container) return;
        var seg = this._container.querySelectorAll('.nux-notif-seg-btn');
        var self = this;
        seg.forEach(function (b) {
            var active = b.getAttribute('data-filter') === self._filter;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    };

    NuxNotificationPanel.prototype._render = function () {
        var self = this;
        if (!self._container) return;
        var list = self._container.querySelector('.nux-notif-panel-list');
        if (!list) return;
        if (self._list.length === 0) {
            var emptyText = self._filter === 'unread' ? '没有未读通知，都处理完了' : '还没有通知';
            var emptyIcon = self._filter === 'unread' ? 'fa-regular fa-circle-check' : 'fa-regular fa-bell-slash';
            list.innerHTML = '<div class="nux-notif-panel-empty"><i class="' + emptyIcon + '"></i><span>' + self._esc(emptyText) + '</span></div>';
        } else {
            var today = [], earlier = [];
            self._list.forEach(function (n) {
                (NexusUtils.notify && NexusUtils.notify.isToday(n.created_at) ? today : earlier).push(n);
            });
            var html = '';
            if (today.length) html += self._group('今天', today);
            if (earlier.length) html += self._group('更早', earlier);
            list.innerHTML = html;
            self._bindItems(list);
        }
        this._renderMuteSection();
        this._renderPagination();
        this._renderUnreadPill();
    };

    NuxNotificationPanel.prototype._group = function (label, items) {
        var self = this;
        return '<div class="nux-notif-group-label">' + self._esc(label) + '</div>' +
            items.map(function (item) { return self._item(item); }).join('');
    };

    NuxNotificationPanel.prototype._item = function (item) {
        var self = this;
        var jobs = NexusUtils.notify ? NexusUtils.notify.jobEntries(item) : [];
        var url = NexusUtils.notify ? NexusUtils.notify.resolve(item) : '';
        var jobsHtml = jobs.map(function (j) {
            return '<button type="button" class="nux-notif-job" data-url="' + self._esc(j.url) + '">' +
                '<span class="nux-notif-job-title">' + self._esc(j.title) + (j.company ? ' @ ' + j.company : '') + '</span>' +
                (j.url ? '<i class="fa-solid fa-chevron-right"></i>' : '') + '</button>';
        }).join('');
        var moreHtml = (url && jobs.length) ? '<button type="button" class="nux-notif-more" data-url="' + self._esc(url) + '">查看全部机会<i class="fa-solid fa-chevron-right"></i></button>' : '';
        var metaApp = NexusUtils.notify ? NexusUtils.notify.appLabel(item.app_id) : item.app_id;
        var confirming = self._confirmId === item.id;
        var delBtn = '<button class="nux-notif-panel-item-delete' + (confirming ? ' is-confirm' : '') + '" title="删除" data-id="' + item.id + '">' +
            (confirming ? '删除?' : '<i class="fa-regular fa-trash-can"></i>') + '</button>';
        return '<div class="nux-notif-panel-item tone-' + self._tone(item.type) +
            (item.is_read ? '' : ' is-unread') + '" data-id="' + item.id + '" tabindex="0" role="listitem">' +
            '<span class="nux-notif-panel-item-icon"><i class="' + self._icon(item.type) + '"></i></span>' +
            '<div class="nux-notif-panel-item-body">' +
            '<div class="nux-notif-panel-item-title">' + self._esc(item.title) + '</div>' +
            '<div class="nux-notif-panel-item-content">' + self._esc(self._summary(item.content)) + '</div>' +
            (jobsHtml ? '<div class="nux-notif-jobs">' + jobsHtml + moreHtml + '</div>' : '') +
            '<div class="nux-notif-panel-item-meta"><span class="nux-notif-app-tag">' + self._esc(metaApp) + '</span>' +
            '<span class="nux-notif-panel-item-time">' + self._esc(self._time(item.created_at)) + '</span></div>' +
            '</div>' +
            '<div class="nux-notif-panel-item-actions">' + delBtn + '</div>' +
            (item.is_read ? '' : '<span class="nux-notif-panel-dot"></span>') +
            '</div>';
    };

    NuxNotificationPanel.prototype._bindItems = function (list) {
        var self = this;
        list.querySelectorAll('.nux-notif-panel-item').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (e.target.closest('.nux-notif-panel-item-actions')) return;
                var jobBtn = e.target.closest('.nux-notif-job, .nux-notif-more');
                var id = parseInt(el.dataset.id, 10);
                var item = self._list.find(function (n) { return n.id === id; });
                if (jobBtn) {
                    self._goto(jobBtn.dataset.url || '', item);
                    return;
                }
                if (item && !item.is_read) {
                    self._manager && self._manager.markRead(id);
                    item.is_read = true;
                    el.classList.remove('is-unread');
                    var dot = el.querySelector('.nux-notif-panel-dot');
                    if (dot) dot.remove();
                }
                var handled = false;
                if (self._onNotificationClick) handled = self._onNotificationClick(item) === true;
                if (!handled && item) self._goto(NexusUtils.notify ? NexusUtils.notify.resolve(item) : '', item);
            });
            el.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (e.target.closest('.nux-notif-job, .nux-notif-more, .nux-notif-panel-item-actions')) return;
                e.preventDefault();
                el.click();
            });
        });
        list.querySelectorAll('.nux-notif-panel-item-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = parseInt(btn.dataset.id, 10);
                if (!id) return;
                if (self._confirmId === id) {
                    self._clearConfirm();
                    self._deleteItem(id);
                } else {
                    self._clearConfirm();
                    self._confirmId = id;
                    self._rerenderDelete(id, true);
                    self._confirmTimer = setTimeout(function () {
                        self._confirmId = null;
                        self._rerenderDelete(id, false);
                    }, 3000);
                }
            });
        });
    };

    NuxNotificationPanel.prototype._rerenderDelete = function (id, confirming) {
        if (!this._container) return;
        var btn = this._container.querySelector('.nux-notif-panel-item-delete[data-id="' + id + '"]');
        if (!btn) return;
        btn.classList.toggle('is-confirm', confirming);
        btn.innerHTML = confirming ? '删除?' : '<i class="fa-regular fa-trash-can"></i>';
    };

    NuxNotificationPanel.prototype._clearConfirm = function () {
        if (this._confirmTimer) { clearTimeout(this._confirmTimer); this._confirmTimer = null; }
        if (this._confirmId != null) {
            this._rerenderDelete(this._confirmId, false);
            this._confirmId = null;
        }
    };

    NuxNotificationPanel.prototype._goto = function (url, item) {
        if (url) window.location.href = url;
        if (this._onNotificationClick) this._onNotificationClick(url ? null : item);
    };

    NuxNotificationPanel.prototype._deleteItem = function (id) {
        var self = this;
        self._getApi().delete(self._baseUrl + '/' + id).then(function () {
            self._list = self._list.filter(function (n) { return n.id !== id; });
            self._total--;
            if (self._onNotificationClick) self._onNotificationClick(null);
            self._render();
            self._refreshUnread();
        }).catch(function () {
            if (window.showToast) window.showToast('删除失败', 'error');
        });
    };

    NuxNotificationPanel.prototype._appsInList = function () {
        var seen = {};
        var apps = [];
        this._list.forEach(function (n) {
            var key = String(n.app_id || '').toLowerCase();
            if (key && !seen[key]) { seen[key] = true; apps.push(n.app_id); }
        });
        return apps;
    };

    NuxNotificationPanel.prototype._renderMuteSection = function () {
        var self = this;
        var host = self._container.querySelector('.nux-notif-mute');
        if (!host) return;
        var apps = self._appsInList();
        if (!apps.length) { host.innerHTML = ''; return; }
        var body = '';
        if (self._muteOpen) {
            body = '<div class="nux-notif-mute-list">' + apps.map(function (app) {
                var key = app.toLowerCase();
                var muted = self._mutedApps.indexOf(key) !== -1;
                return '<label class="nux-notif-mute-row"><span>' + self._esc(NexusUtils.notify ? NexusUtils.notify.appLabel(app) : app) +
                    '</span><button type="button" class="nux-notif-mute-toggle' + (muted ? ' is-muted' : '') +
                    '" data-app="' + self._esc(key) + '">' + (muted ? '已静音' : '接收中') + '</button></label>';
            }).join('') + '<p class="nux-notif-mute-hint">静音后不再接收该应用的新通知</p></div>';
        }
        host.innerHTML = '<button type="button" class="nux-notif-mute-head"><i class="fa-solid fa-sliders"></i>应用通知管理' +
            '<i class="fa-solid fa-chevron-' + (self._muteOpen ? 'up' : 'down') + '"></i></button>' + body;
        host.querySelector('.nux-notif-mute-head').addEventListener('click', function () {
            self._muteOpen = !self._muteOpen;
            if (self._muteOpen && !self._mutedLoaded) self._loadMuted();
            else self._renderMuteSection();
        });
        host.querySelectorAll('.nux-notif-mute-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () { self._toggleMute(btn.dataset.app); });
        });
    };

    NuxNotificationPanel.prototype._loadMuted = function () {
        var self = this;
        self._getApi().get(self._baseUrl + '/app-preferences').then(function (d) {
            self._mutedApps = (d && d.muted_apps) || [];
            self._mutedLoaded = true;
            self._renderMuteSection();
        }).catch(function () { self._mutedLoaded = true; self._renderMuteSection(); });
    };

    NuxNotificationPanel.prototype._toggleMute = function (appKey) {
        var self = this;
        var muted = self._mutedApps.indexOf(appKey) === -1;
        self._getApi().put(self._baseUrl + '/app-preferences/' + encodeURIComponent(appKey), { muted: muted }).then(function () {
            if (muted) self._mutedApps.push(appKey);
            else self._mutedApps = self._mutedApps.filter(function (a) { return a !== appKey; });
            self._renderMuteSection();
        }).catch(function () {
            if (window.showToast) window.showToast('操作失败', 'error');
        });
    };

    NuxNotificationPanel.prototype._renderPagination = function () {
        var self = this;
        var footer = self._container.querySelector('.nux-notif-panel-footer');
        if (!footer) return;
        var totalPages = Math.ceil(self._total / self._pageSize) || 1;
        if (totalPages <= 1) { footer.innerHTML = ''; return; }
        var html = '<div class="nux-notif-panel-pages">';
        html += '<button class="nux-notif-panel-page-btn" data-page="' + (self._page - 1) + '"' + (self._page <= 1 ? ' disabled' : '') + ' aria-label="上一页"><i class="fa-solid fa-chevron-left"></i></button>';
        html += '<span class="nux-notif-panel-page-info">' + self._page + ' / ' + totalPages + '</span>';
        html += '<button class="nux-notif-panel-page-btn" data-page="' + (self._page + 1) + '"' + (self._page >= totalPages ? ' disabled' : '') + ' aria-label="下一页"><i class="fa-solid fa-chevron-right"></i></button>';
        html += '</div>';
        footer.innerHTML = html;
        footer.querySelectorAll('.nux-notif-panel-page-btn:not([disabled])').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var page = parseInt(btn.dataset.page, 10);
                if (page) self.load(page);
            });
        });
    };

    NuxNotificationPanel.prototype.mount = function (el) {
        var self = this;
        self._container = el;
        el.innerHTML = '<div class="nux-notif-panel-page">' +
            '<div class="nux-notif-panel-header">' +
            '<h3 class="nux-notif-panel-title">通知中心</h3>' +
            '<span class="nux-notif-unread-pill" role="status"></span>' +
            '<button class="nux-notif-panel-mark-all" id="nux-notif-mark-all" style="display:none">全部已读</button>' +
            '</div>' +
            '<div class="nux-notif-panel-toolbar">' +
            '<div class="nux-notif-seg" role="tablist" aria-label="通知筛选">' +
            '<button type="button" class="nux-notif-seg-btn" role="tab" aria-selected="false" data-filter="unread">未读</button>' +
            '<button type="button" class="nux-notif-seg-btn active" role="tab" aria-selected="true" data-filter="all">全部</button>' +
            '</div></div>' +
            '<div class="nux-notif-panel-list"></div>' +
            '<div class="nux-notif-mute"></div>' +
            '<div class="nux-notif-panel-footer"></div>' +
            '</div>';
        el.querySelector('#nux-notif-mark-all').addEventListener('click', function () {
            if (!self._manager) return;
            self._manager.markAllRead().then(function () {
                self._list.forEach(function (n) { n.is_read = true; });
                self._render();
                self._refreshUnread();
                if (window.showToast) window.showToast('已全部标记为已读', 'success');
            }).catch(function () {
                if (window.showToast) window.showToast('操作失败', 'error');
            });
        });
        el.querySelectorAll('.nux-notif-seg-btn').forEach(function (b) {
            b.addEventListener('click', function () { self.setFilter(b.getAttribute('data-filter')); });
        });
        self.load(1);
        return self;
    };

    window.NuxNotificationPanel = NuxNotificationPanel;
})();
