(function () {
    var DEFAULT_BASE_URL = '/api/notify';
    var SSE_MAX_RECONNECT = 3;
    var SSE_RECONNECT_INTERVAL = 5000;

    function NotificationManager(options) {
        options = options || {};
        this._baseUrl = options.baseUrl || DEFAULT_BASE_URL;
        this._tokenKey = options.tokenKey || 'uc_access_token';
        this._listeners = [];
        this._unreadCount = 0;
        this._notifications = [];
        this._eventSource = null;
        this._sseTimer = null;
        this._sseAttempts = 0;
        this._sseClosed = false;
        this._reconnect = options.reconnect !== false;
        this._onNotification = options.onNotification || null;
        this._pollTimer = null;
        this._pollInterval = options.pollInterval || 60000;
    }

    NotificationManager.prototype._getToken = function () {
        return localStorage.getItem(this._tokenKey);
    };

    NotificationManager.prototype._getApi = function () {
        var self = this;
        if (!this._api) {
            this._api = new NexusApi({
                baseUrl: '',
                tokenKey: self._tokenKey,
                onUnauthorized: function () {},
                onError: function () {}
            });
        }
        return this._api;
    };

    NotificationManager.prototype.getUnreadCount = function () {
        var self = this;
        return self._getApi().get(self._baseUrl + '/unread-count').then(function (resp) {
            self._unreadCount = resp.count || 0;
            return self._unreadCount;
        }).catch(function () {
            return self._unreadCount;
        });
    };

    NotificationManager.prototype.getList = function (params) {
        var self = this;
        params = params || { page: 1, page_size: 20 };
        return self._getApi().get(self._baseUrl + '/notifications', params).then(function (resp) {
            self._notifications = resp.items || [];
            return resp;
        });
    };

    NotificationManager.prototype.markRead = function (id) {
        var self = this;
        return self._getApi().put(self._baseUrl + '/' + id + '/read').then(function () {
            var item = self._notifications.find(function (n) { return n.id === id; });
            if (item) item.is_read = true;
            if (self._unreadCount > 0) self._unreadCount--;
            self._emit('read', { id: id });
        });
    };

    NotificationManager.prototype.markAllRead = function () {
        var self = this;
        return self._getApi().put(self._baseUrl + '/read-all').then(function () {
            self._notifications.forEach(function (n) { n.is_read = true; });
            self._unreadCount = 0;
            self._emit('read-all', {});
        });
    };

    NotificationManager.prototype.deleteNotification = function (id) {
        var self = this;
        return self._getApi().delete(self._baseUrl + '/' + id).then(function () {
            self._notifications = self._notifications.filter(function (n) { return n.id !== id; });
            self._emit('delete', { id: id });
        });
    };

    NotificationManager.prototype._emit = function (event, data) {
        for (var i = 0; i < this._listeners.length; i++) {
            var l = this._listeners[i];
            if (l.event === event || l.event === '*') {
                try { l.fn(data); } catch (e) {}
            }
        }
    };

    NotificationManager.prototype.on = function (event, fn) {
        this._listeners.push({ event: event, fn: fn });
        return this;
    };

    NotificationManager.prototype.off = function (event, fn) {
        this._listeners = this._listeners.filter(function (l) {
            return !(l.event === event && l.fn === fn);
        });
        return this;
    };

    NotificationManager.prototype.connectSSE = function () {
        var self = this;
        self.disconnectSSE();
        self._sseClosed = false;
        var token = self._getToken();
        if (!token) return;
        try {
            var url = self._baseUrl + '/stream?token=' + encodeURIComponent(token);
            self._eventSource = new EventSource(url);
            self._eventSource.addEventListener('notification', function (e) {
                self._sseAttempts = 0;
                try {
                    var notif = JSON.parse(e.data);
                    self._unreadCount++;
                    self._notifications.unshift(notif);
                    if (self._onNotification) self._onNotification(notif);
                    self._emit('notification', notif);
                } catch (err) {}
            });
            self._eventSource.onerror = function () {
                if (self._eventSource) { self._eventSource.close(); self._eventSource = null; }
                if (self._sseClosed) return;
                if (self._reconnect && self._sseAttempts < SSE_MAX_RECONNECT) {
                    self._sseAttempts++;
                    self._sseTimer = setTimeout(function () { self.connectSSE(); }, SSE_RECONNECT_INTERVAL * self._sseAttempts);
                }
            };
        } catch (e) {}
    };

    NotificationManager.prototype.disconnectSSE = function () {
        this._sseClosed = true;
        if (this._sseTimer) { clearTimeout(this._sseTimer); this._sseTimer = null; }
        if (this._eventSource) { this._eventSource.close(); this._eventSource = null; }
        this._sseAttempts = 0;
    };

    NotificationManager.prototype.startPolling = function () {
        var self = this;
        self.stopPolling();
        self.getUnreadCount();
        self._pollTimer = setInterval(function () { self.getUnreadCount(); }, self._pollInterval);
    };

    NotificationManager.prototype.stopPolling = function () {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    };

    NotificationManager.prototype.start = function () {
        this.connectSSE();
        this.startPolling();
    };

    NotificationManager.prototype.stop = function () {
        this.disconnectSSE();
        this.stopPolling();
    };

    window.NexusNotification = NotificationManager;
    window.NexusNotificationManager = new NotificationManager();
})();