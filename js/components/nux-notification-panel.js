(function () {
    var TYPE_ICONS = {
        message: 'fa-regular fa-comment', comment: 'fa-regular fa-comment',
        order: 'fa-solid fa-cart-shopping', trade: 'fa-solid fa-cart-shopping',
        system: 'fa-solid fa-circle-info', alert: 'fa-solid fa-triangle-exclamation',
        follow: 'fa-solid fa-user-plus', like: 'fa-solid fa-heart',
        task: 'fa-solid fa-list-check', approval: 'fa-solid fa-file-signature'
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
    }

    NuxNotificationPanel.prototype._icon = function (type) {
        return TYPE_ICONS[type] || 'fa-regular fa-bell';
    };

    NuxNotificationPanel.prototype._time = function (ts) {
        if (!ts) return '';
        var d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        var now = new Date();
        var diff = Math.floor((now - d) / 1000);
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
        if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
        return d.toLocaleDateString('zh-CN');
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

    NuxNotificationPanel.prototype.load = function (page) {
        var self = this;
        if (page) self._page = page;
        self._loading = true;
        if (self._container) {
            var list = self._container.querySelector('.nux-notif-panel-list');
            if (list) list.innerHTML = '<div class="nux-notif-panel-loading"><span class="nx-spinner"></span></div>';
        }
        return self._getApi().get(self._baseUrl + '/notifications', { page: self._page, page_size: self._pageSize }).then(function (resp) {
            self._list = resp.items || [];
            self._total = resp.total || 0;
            self._loading = false;
            self._render();
        }).catch(function () {
            self._loading = false;
            if (self._container) {
                var list = self._container.querySelector('.nux-notif-panel-list');
                if (list) list.innerHTML = '<div class="nux-notif-panel-error"><i class="fa-solid fa-triangle-exclamation"></i><span>加载失败</span></div>';
            }
        });
    };

    NuxNotificationPanel.prototype._render = function () {
        var self = this;
        if (!self._container) return;
        var list = self._container.querySelector('.nux-notif-panel-list');
        if (!list) return;
        if (self._list.length === 0) {
            list.innerHTML = '<div class="nux-notif-panel-empty"><i class="fa-regular fa-bell-slash"></i><span>暂无通知</span></div>';
            return;
        }
        list.innerHTML = self._list.map(function (item) {
            return '<div class="nux-notif-panel-item' + (item.is_read ? '' : ' is-unread') + '" data-id="' + item.id + '" tabindex="0" role="listitem">' +
                '<span class="nux-notif-panel-item-icon"><i class="' + self._icon(item.type) + '"></i></span>' +
                '<div class="nux-notif-panel-item-body">' +
                '<div class="nux-notif-panel-item-title">' + self._esc(item.title) + '</div>' +
                '<div class="nux-notif-panel-item-content">' + self._esc(self._summary(item.content)) + '</div>' +
                '<div class="nux-notif-panel-item-time">' + self._esc(self._time(item.created_at)) + '</div>' +
                '</div>' +
                '<div class="nux-notif-panel-item-actions">' +
                '<button class="nux-notif-panel-item-delete" title="删除" data-id="' + item.id + '"><i class="fa-regular fa-trash-can"></i></button>' +
                '</div>' +
                (item.is_read ? '' : '<span class="nux-notif-panel-dot"></span>') +
                '</div>';
        }).join('');

        self._renderPagination();

        list.querySelectorAll('.nux-notif-panel-item').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (e.target.closest('.nux-notif-panel-item-actions')) return;
                var id = parseInt(el.dataset.id, 10);
                if (!id) return;
                var item = self._list.find(function (n) { return n.id === id; });
                if (!item.is_read) {
                    self._manager && self._manager.markRead(id);
                    el.classList.remove('is-unread');
                    var dot = el.querySelector('.nux-notif-panel-dot');
                    if (dot) dot.remove();
                }
                if (self._onNotificationClick) self._onNotificationClick(item);
            });
        });

        list.querySelectorAll('.nux-notif-panel-item-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = parseInt(btn.dataset.id, 10);
                if (!id) return;
                self._deleteItem(id);
            });
        });
    };

    NuxNotificationPanel.prototype._deleteItem = function (id) {
        var self = this;
        self._getApi().delete(self._baseUrl + '/' + id).then(function () {
            self._list = self._list.filter(function (n) { return n.id !== id; });
            self._total--;
            self._render();
        }).catch(function () {
            if (window.showToast) window.showToast('删除失败', 'error');
        });
    };

    NuxNotificationPanel.prototype._renderPagination = function () {
        var self = this;
        var footer = self._container.querySelector('.nux-notif-panel-footer');
        if (!footer) return;
        var totalPages = Math.ceil(self._total / self._pageSize) || 1;
        if (totalPages <= 1) { footer.innerHTML = ''; return; }
        var html = '<div class="nux-notif-panel-pages">';
        if (self._page > 1) {
            html += '<button class="nux-notif-panel-page-btn" data-page="' + (self._page - 1) + '"><i class="fa-solid fa-chevron-left"></i></button>';
        }
        html += '<span class="nux-notif-panel-page-info">' + self._page + ' / ' + totalPages + '</span>';
        if (self._page < totalPages) {
            html += '<button class="nux-notif-panel-page-btn" data-page="' + (self._page + 1) + '"><i class="fa-solid fa-chevron-right"></i></button>';
        }
        html += '</div>';
        footer.innerHTML = html;
        footer.querySelectorAll('.nux-notif-panel-page-btn').forEach(function (btn) {
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
            '<button class="nux-notif-panel-mark-all" id="nux-notif-mark-all">全部已读</button>' +
            '</div>' +
            '<div class="nux-notif-panel-list"></div>' +
            '<div class="nux-notif-panel-footer"></div>' +
            '</div>';
        el.querySelector('#nux-notif-mark-all').addEventListener('click', function () {
            if (self._manager) {
                self._manager.markAllRead().then(function () {
                    self._list.forEach(function (n) { n.is_read = true; });
                    self._render();
                    if (window.showToast) window.showToast('已全部标记为已读', 'success');
                }).catch(function () {
                    if (window.showToast) window.showToast('操作失败', 'error');
                });
            }
        });
        self.load(1);
        return self;
    };

    window.NuxNotificationPanel = NuxNotificationPanel;
})();