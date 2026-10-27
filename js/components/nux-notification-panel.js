(function () {
    function NuxNotificationPanel(options) {
        options = options || {};
        this._baseUrl = options.baseUrl || '/api/notify';
        this._tokenKey = options.tokenKey || 'uc_access_token';
        this._list = []; this._total = 0; this._page = 1; this._pageSize = 20;
        this._loading = false; this._container = null;
        this._manager = options.manager || null;
        this._onNotificationClick = options.onNotificationClick || null;
        this._mutedApps = []; this._muteOpen = false; this._mutedLoaded = false;
        this._filter = 'all'; this._box = 'inbox'; this._typeFilter = '';
        this._inboxBox = 'action'; this._boxSummary = null;
        this._typeItems = []; this._unreadReal = null;
        this._confirmId = null; this._confirmTimer = null;
    }
    NuxNotificationPanel.prototype._esc = function (v) {
        return window.NexusUtils ? window.NexusUtils.escapeHtml(v) : String(v == null ? '' : v);
    };
    NuxNotificationPanel.prototype._getApi = function () {
        if (!this._api) this._api = new NexusApi({ baseUrl: '', tokenKey: this._tokenKey });
        return this._api;
    };
    NuxNotificationPanel.prototype._fetchSummary = function () {
        var self = this;
        self._getApi().get(self._baseUrl + '/notifications/box-summary').then(function (d) {
            self._boxSummary = d || null;
            self._renderInboxSeg();
        }).catch(function () {
            self._boxSummary = null;
            self._renderInboxSeg();
        });
        var url = self._baseUrl + '/type-summary';
        if (self._inboxBox) url += '?box=' + self._inboxBox;
        self._getApi().get(url).then(function (d) {
            self._typeItems = (d && Array.isArray(d.items)) ? d.items : [];
            var unread = 0;
            self._typeItems.forEach(function (t) { unread += (t.unread || 0); });
            self._unreadReal = unread;
            self._renderChips();
            self._syncPanels();
            self._renderUnreadPill();
        }).catch(function () {});
    };
    NuxNotificationPanel.prototype._inboxBoxCount = function (boxKey, field) {
        var s = this._boxSummary;
        if (!s || !Array.isArray(s.boxes)) return null;
        for (var i = 0; i < s.boxes.length; i++) {
            if (s.boxes[i].box === boxKey) return s.boxes[i][field || 'unread'];
        }
        return null;
    };
    NuxNotificationPanel.prototype._renderInboxSeg = function () {
        if (!this._container) return;
        var host = this._container.querySelector('.nux-notif-inboxseg');
        if (!host) return;
        var self = this;
        host.innerHTML = [
            { key: 'action', label: '与你相关' },
            { key: 'insight', label: '资讯动态' }
        ].map(function (b) {
            var unread = self._inboxBoxCount(b.key, 'unread');
            var active = self._box === 'inbox' && self._inboxBox === b.key;
            var label = unread > 0 ? b.label + '，' + unread + ' 条未读' : b.label;
            return '<button type="button" class="nux-notif-inboxbox-btn' + (active ? ' active' : '') +
                '" data-inbox-box="' + b.key + '" aria-pressed="' + active + '" aria-label="' + label + '">' + b.label +
                (unread > 0 ? '<span class="nux-notif-inboxbox-count" aria-hidden="true">' + unread + '</span>' : '') +
                '</button>';
        }).join('');
    };
    NuxNotificationPanel.prototype._renderUnreadPill = function () {
        if (!this._container) return;
        var pill = this._container.querySelector('.nux-notif-unread-pill');
        if (!pill) return;
        var markAll = this._container.querySelector('.nux-notif-panel-mark-all');
        if (this._box === 'archive') {
            pill.textContent = '已归档 ' + this._total + ' 条';
            pill.classList.remove('has-unread');
        } else {
            var n = this._unreadReal;
            pill.textContent = (n == null) ? '' : (n > 0 ? n + ' 条未读' : '已全部读完');
            pill.classList.toggle('has-unread', n > 0);
        }
        if (markAll) {
            markAll.style.display = (this._manager && this._box === 'inbox' && !this._typeFilter && this._unreadReal > 0) ? '' : 'none';
        }
    };
    NuxNotificationPanel.prototype.load = function (page) {
        var self = this;
        if (page) self._page = page;
        self._loading = true;
        self._clearConfirm();
        var list = self._container && self._container.querySelector('.nux-notif-panel-list');
        if (list) list.innerHTML = '<div class="nux-notif-panel-loading"><span class="nx-spinner"></span></div>';
        var params = { page: self._page, page_size: self._pageSize };
        if (self._box === 'archive') params.archived = 'true';
        if (self._box === 'inbox') {
            params.box = self._inboxBox;
            if (self._filter === 'unread') params.is_read = 'false';
        }
        if (self._typeFilter) params.type = self._typeFilter;
        return self._getApi().get(self._baseUrl + '/notifications', params).then(function (resp) {
            self._list = resp.items || [];
            self._total = resp.total || 0;
            self._loading = false;
            self._render();
            if (self._box === 'inbox') self._fetchSummary();
            else self._renderUnreadPill();
        }).catch(function () {
            self._loading = false;
            if (list) list.innerHTML = '<div class="nux-notif-panel-error"><i class="fa-solid fa-triangle-exclamation"></i><span>加载失败</span></div>';
        });
    };
    NuxNotificationPanel.prototype.setBox = function (b) {
        if (this._box === b) return;
        this._box = b;
        this._typeFilter = '';
        this._syncTabs();
        this._syncPanels();
        this._renderInboxSeg();
        this.load(1);
    };
    NuxNotificationPanel.prototype.setInboxBox = function (b) {
        if (this._inboxBox === b) return;
        this._inboxBox = b;
        this._typeFilter = '';
        this._renderInboxSeg();
        this._syncSegButtons();
        this.load(1);
        if (this._box === 'inbox') this._fetchSummary();
    };
    NuxNotificationPanel.prototype.setFilter = function (f) {
        if (this._filter === f) return;
        this._filter = f;
        this._syncSegButtons();
        this.load(1);
    };
    NuxNotificationPanel.prototype.setType = function (t) {
        this._typeFilter = this._typeFilter === t ? '' : t;
        this._renderChips();
        this.load(1);
    };
    NuxNotificationPanel.prototype._syncTabs = function () {
        if (!this._container) return;
        var self = this;
        this._container.querySelectorAll('.nux-notif-box-btn').forEach(function (b) {
            var active = b.getAttribute('data-box') === self._box;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    };
    NuxNotificationPanel.prototype._syncSegButtons = function () {
        if (!this._container) return;
        var self = this;
        this._container.querySelectorAll('.nux-notif-seg-btn').forEach(function (b) {
            var active = b.getAttribute('data-filter') === self._filter;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    };
    NuxNotificationPanel.prototype._syncPanels = function () {
        var c = this._container;
        if (!c) return;
        var inbox = this._box === 'inbox';
        var toolbar = c.querySelector('.nux-notif-panel-toolbar');
        if (toolbar) toolbar.style.display = inbox ? '' : 'none';
        var inboxseg = c.querySelector('.nux-notif-inboxseg');
        if (inboxseg) inboxseg.style.display = inbox ? '' : 'none';
        var chips = c.querySelector('.nux-notif-chips');
        if (chips) chips.style.display = (inbox && this._typeItems.length) ? '' : 'none';
        var mute = c.querySelector('.nux-notif-mute');
        if (mute) mute.style.display = inbox ? '' : 'none';
    };
    NuxNotificationPanel.prototype._renderChips = function () {
        if (!this._container) return;
        var host = this._container.querySelector('.nux-notif-chips');
        if (!host) return;
        var self = this;
        var items = this._typeItems.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 6);
        host.innerHTML = items.map(function (t) {
            var active = self._typeFilter === t.type;
            return '<button type="button" class="nux-notif-chip' + (active ? ' active' : '') +
                '" aria-pressed="' + active + '" data-type="' + self._esc(t.type) + '">' +
                self._esc(NexusUtils.notify.typeLabel(t.type)) + '<span>' + t.total + '</span></button>';
        }).join('');
        host.classList.toggle('is-scrollable', host.scrollWidth > host.clientWidth);
    };
    NuxNotificationPanel.prototype._render = function () {
        var self = this;
        var list = self._container && self._container.querySelector('.nux-notif-panel-list');
        if (!list) return;
        if (self._list.length === 0) {
            var icon, body;
            if (self._box === 'archive') {
                icon = 'fa-solid fa-box-archive';
                body = '<span class="nux-notif-empty-title">没有归档通知</span><span class="nux-notif-empty-sub">7 天前的未读会自动移到这里，随时可回看</span>';
            } else if (self._filter === 'unread') {
                icon = 'fa-regular fa-circle-check';
                body = '<span>没有未读通知，都处理完了</span>';
            } else if (self._inboxBox === 'action') {
                icon = 'fa-regular fa-bell';
                body = '<span class="nux-notif-empty-title">没有需要你处理的通知</span><span class="nux-notif-empty-sub">任务、匹配、回执会出现在这里</span>';
            } else {
                icon = 'fa-regular fa-newspaper';
                body = '<span class="nux-notif-empty-title">暂无资讯动态</span><span class="nux-notif-empty-sub">日报、周报、行情播报会出现在这里</span>';
            }
            list.innerHTML = '<div class="nux-notif-panel-empty"><i class="' + icon + '"></i>' + body + '</div>';
        } else {
            var today = [], earlier = [];
            self._list.forEach(function (n) {
                (NexusUtils.notify.isToday(n.created_at) ? today : earlier).push(n);
            });
            var html = '';
            if (today.length) html += self._group('今天', today);
            if (earlier.length) html += self._group('更早', earlier);
            list.innerHTML = html;
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
        var archived = self._box === 'archive';
        var jobs = NexusUtils.notify.jobEntries(item);
        var url = NexusUtils.notify.resolve(item);
        var jobsHtml = jobs.map(function (j) {
            return '<button type="button" class="nux-notif-job" data-url="' + self._esc(j.url) + '">' +
                '<span class="nux-notif-job-title">' + self._esc(j.title) + (j.company ? ' @ ' + j.company : '') + '</span>' +
                (j.url ? '<i class="fa-solid fa-chevron-right"></i>' : '') + '</button>';
        }).join('');
        var moreHtml = (url && jobs.length) ? '<button type="button" class="nux-notif-more" data-url="' + self._esc(url) + '">查看全部机会<i class="fa-solid fa-chevron-right"></i></button>' : '';
        var confirming = self._confirmId === item.id;
        var delBtn = '<button class="nux-notif-panel-item-delete' + (confirming ? ' is-confirm' : '') +
            '" title="删除" data-id="' + item.id + '">' + (confirming ? '删除?' : '<i class="fa-regular fa-trash-can"></i>') + '</button>';
        return '<div class="nux-notif-panel-item tone-' + NexusUtils.notify.typeTone(item.type) +
            (archived ? ' is-archived' : (item.is_read ? '' : ' is-unread')) + '" data-id="' + item.id + '" tabindex="0" role="listitem">' +
            '<span class="nux-notif-panel-item-icon"><i class="' + NexusUtils.notify.typeIcon(item.type) + '"></i></span>' +
            '<div class="nux-notif-panel-item-body">' +
            '<div class="nux-notif-panel-item-title">' + self._esc(item.title) + '</div>' +
            '<div class="nux-notif-panel-item-content">' + self._esc(NexusUtils.notify.clip(item.content, 80)) + '</div>' +
            (jobsHtml ? '<div class="nux-notif-jobs">' + jobsHtml + moreHtml + '</div>' : '') +
            '<div class="nux-notif-panel-item-meta"><span class="nux-notif-app-tag">' + self._esc(NexusUtils.notify.appLabel(item.app_id)) + '</span>' +
            '<span class="nux-notif-panel-item-time">' + self._esc(self._time(item.created_at)) + '</span></div>' +
            '</div>' +
            '<div class="nux-notif-panel-item-actions">' + delBtn + '</div>' +
            (archived || item.is_read ? '' : '<span class="nux-notif-panel-dot"></span>') +
            '</div>';
    };
    NuxNotificationPanel.prototype._time = function (ts) {
        return ts && window.NexusUtils ? NexusUtils.formatRelativeTime(ts) : '';
    };
    NuxNotificationPanel.prototype._onRootClick = function (e) {
        var boxBtn = e.target.closest('[data-box]');
        if (boxBtn) return this.setBox(boxBtn.getAttribute('data-box'));
        var inboxBoxBtn = e.target.closest('[data-inbox-box]');
        if (inboxBoxBtn) return this.setInboxBox(inboxBoxBtn.getAttribute('data-inbox-box'));
        var seg = e.target.closest('.nux-notif-seg-btn');
        if (seg) return this.setFilter(seg.getAttribute('data-filter'));
        var chip = e.target.closest('.nux-notif-chip');
        if (chip) return this.setType(chip.getAttribute('data-type'));
        if (e.target.closest('.nux-notif-panel-mark-all')) return this._markAllRead();
        var del = e.target.closest('.nux-notif-panel-item-delete');
        if (del) return this._onDeleteClick(del);
        var pageBtn = e.target.closest('.nux-notif-panel-page-btn');
        if (pageBtn && !pageBtn.disabled) return this.load(parseInt(pageBtn.getAttribute('data-page'), 10));
        if (e.target.closest('.nux-notif-mute-head')) return this._toggleMuteOpen();
        var muteBtn = e.target.closest('.nux-notif-mute-toggle');
        if (muteBtn) return this._toggleMute(muteBtn.getAttribute('data-app'));
        var itemEl = e.target.closest('.nux-notif-panel-item');
        if (itemEl) {
            var jobBtn = e.target.closest('.nux-notif-job, .nux-notif-more');
            this._activateItem(itemEl, jobBtn ? jobBtn.getAttribute('data-url') : '');
        }
    };
    NuxNotificationPanel.prototype._onRootKeydown = function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var itemEl = e.target.closest('.nux-notif-panel-item');
        if (!itemEl || e.target.closest('.nux-notif-job, .nux-notif-more, .nux-notif-panel-item-actions')) return;
        e.preventDefault();
        itemEl.click();
    };
    NuxNotificationPanel.prototype._activateItem = function (el, jobUrl) {
        var id = parseInt(el.getAttribute('data-id'), 10);
        var item = this._list.find(function (n) { return n.id === id; });
        if (!item) return;
        if (jobUrl) return this._goto(jobUrl, item);
        if (!item.is_read) {
            if (this._manager) this._manager.markRead(id);
            item.is_read = true;
            el.classList.remove('is-unread');
            var dot = el.querySelector('.nux-notif-panel-dot');
            if (dot) dot.remove();
            if (this._unreadReal > 0) {
                this._unreadReal--;
                this._renderUnreadPill();
            }
        }
        var handled = this._onNotificationClick && this._onNotificationClick(item) === true;
        if (!handled) this._goto(NexusUtils.notify.resolve(item), item);
    };
    NuxNotificationPanel.prototype._onDeleteClick = function (btn) {
        var id = parseInt(btn.getAttribute('data-id'), 10);
        if (!id) return;
        if (this._confirmId === id) {
            this._clearConfirm();
            this._deleteItem(id);
            return;
        }
        this._clearConfirm();
        this._confirmId = id;
        this._setDeleteState(id, true);
        var self = this;
        this._confirmTimer = setTimeout(function () {
            self._confirmId = null;
            self._setDeleteState(id, false);
        }, 3000);
    };
    NuxNotificationPanel.prototype._setDeleteState = function (id, confirming) {
        if (!this._container) return;
        var btn = this._container.querySelector('.nux-notif-panel-item-delete[data-id="' + id + '"]');
        if (!btn) return;
        btn.classList.toggle('is-confirm', confirming);
        btn.innerHTML = confirming ? '删除?' : '<i class="fa-regular fa-trash-can"></i>';
    };
    NuxNotificationPanel.prototype._clearConfirm = function () {
        if (this._confirmTimer) { clearTimeout(this._confirmTimer); this._confirmTimer = null; }
        if (this._confirmId != null) {
            this._setDeleteState(this._confirmId, false);
            this._confirmId = null;
        }
    };
    NuxNotificationPanel.prototype._goto = function (url, item) {
        if (url) window.location.href = url;
        if (this._onNotificationClick) this._onNotificationClick(url ? null : item);
    };
    NuxNotificationPanel.prototype._markAllRead = function () {
        var self = this;
        if (!self._manager) return;
        var box = self._box === 'inbox' ? self._inboxBox : '';
        self._manager.markAllRead(box).then(function () {
            if (window.showToast) window.showToast('已全部标记为已读', 'success');
            self.load(1);
        }).catch(function () {
            if (window.showToast) window.showToast('操作失败', 'error');
        });
    };
    NuxNotificationPanel.prototype._deleteItem = function (id) {
        var self = this;
        self._getApi().delete(self._baseUrl + '/' + id).then(function () {
            self._list = self._list.filter(function (n) { return n.id !== id; });
            self._total--;
            if (self._onNotificationClick) self._onNotificationClick(null);
            self._render();
            if (self._box === 'inbox') self._fetchSummary();
            else self._renderUnreadPill();
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
                return '<label class="nux-notif-mute-row"><span>' + self._esc(NexusUtils.notify.appLabel(app)) +
                    '</span><button type="button" class="nux-notif-mute-toggle' + (muted ? ' is-muted' : '') +
                    '" data-app="' + self._esc(key) + '">' + (muted ? '已静音' : '接收中') + '</button></label>';
            }).join('') + '<p class="nux-notif-mute-hint">静音后不再接收该应用的新通知</p></div>';
        }
        host.innerHTML = '<button type="button" class="nux-notif-mute-head"><i class="fa-solid fa-sliders"></i>应用通知管理' +
            '<i class="fa-solid fa-chevron-' + (self._muteOpen ? 'up' : 'down') + '"></i></button>' + body;
    };
    NuxNotificationPanel.prototype._toggleMuteOpen = function () {
        this._muteOpen = !this._muteOpen;
        if (this._muteOpen && !this._mutedLoaded) this._loadMuted();
        else this._renderMuteSection();
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
        var footer = this._container.querySelector('.nux-notif-panel-footer');
        if (!footer) return;
        var totalPages = Math.ceil(this._total / this._pageSize) || 1;
        if (totalPages <= 1) { footer.innerHTML = ''; return; }
        var prev = '<button class="nux-notif-panel-page-btn" data-page="' + (this._page - 1) + '"' + (this._page <= 1 ? ' disabled' : '') + ' aria-label="上一页"><i class="fa-solid fa-chevron-left"></i></button>';
        var next = '<button class="nux-notif-panel-page-btn" data-page="' + (this._page + 1) + '"' + (this._page >= totalPages ? ' disabled' : '') + ' aria-label="下一页"><i class="fa-solid fa-chevron-right"></i></button>';
        footer.innerHTML = '<div class="nux-notif-panel-pages">' + prev + '<span class="nux-notif-panel-page-info">' + this._page + ' / ' + totalPages + '</span>' + next + '</div>';
    };
    NuxNotificationPanel.prototype.mount = function (el) {
        var self = this;
        self._container = el;
        el.innerHTML = '<div class="nux-notif-panel-page">' +
            '<div class="nux-notif-panel-header">' +
            '<h3 class="nux-notif-panel-title">通知中心</h3>' +
            '<span class="nux-notif-push-slot"></span>' +
            '<span class="nux-notif-unread-pill" role="status"></span>' +
            '<button class="nux-notif-panel-mark-all" id="nux-notif-mark-all" style="display:none">全部已读</button></div>' +
            '<div class="nux-notif-push-banner-slot"></div>' +
            '<div class="nux-notif-panel-boxes" role="tablist" aria-label="通知箱">' +
            '<button type="button" class="nux-notif-box-btn active" role="tab" aria-selected="true" data-box="inbox">收件箱</button>' +
            '<button type="button" class="nux-notif-box-btn" role="tab" aria-selected="false" data-box="archive">归档箱</button></div>' +
            '<div class="nux-notif-panel-toolbar">' +
            '<div class="nux-notif-inboxseg" role="group" aria-label="按价值分箱"></div>' +
            '<div class="nux-notif-seg" role="tablist" aria-label="通知筛选">' +
            '<button type="button" class="nux-notif-seg-btn" role="tab" aria-selected="false" data-filter="unread">未读</button>' +
            '<button type="button" class="nux-notif-seg-btn active" role="tab" aria-selected="true" data-filter="all">全部</button>' +
            '</div></div>' +
            '<div class="nux-notif-chips" aria-label="按类型筛选"></div>' +
            '<div class="nux-notif-panel-list"></div>' +
            '<div class="nux-notif-mute"></div>' +
            '<div class="nux-notif-panel-footer"></div></div>';
        el.addEventListener('click', function (e) { self._onRootClick(e); });
        el.addEventListener('keydown', function (e) { self._onRootKeydown(e); });
        self.load(1);
        return self;
    };
    window.NuxNotificationPanel = NuxNotificationPanel;
})();
