(function() {
    const NuxNotificationBell = {
        name: 'nux-notification-bell',
        props: {
            baseUrl: { type: String, default: '/notifycenter' },
            pollInterval: { type: Number, default: 60000 },
            maxVisible: { type: Number, default: 10 },
            title: { type: String, default: '消息通知' },
            centerUrl: { type: String, default: '' }
        },
        data: function() {
            return {
                open: false,
                unread: 0,
                items: [],
                total: 0,
                loading: false,
                error: '',
                timer: null,
                token: '',
                filter: 'all',
                listSeq: 0
            };
        },
        computed: {
            authed: function() { return !!this.token; },
            hiddenCount: function() { return Math.max(0, this.total - this.items.length); },
            hasUnreadItems: function() { return this.items.some(function(i) { return !i.is_read; }); },
            groups: function() {
                var boxed = this.items.length > 0 && this.items.every(function(n) {
                    return n.box === 'action' || n.box === 'insight';
                });
                if (boxed) {
                    var act = [], ins = [];
                    this.items.forEach(function(n) {
                        (n.box === 'action' ? act : ins).push(n);
                    });
                    var g = [];
                    if (act.length) g.push({ label: '与你相关', items: act, unread: act.filter(function(n) { return !n.is_read; }).length });
                    if (ins.length) g.push({ label: '资讯动态', items: ins, unread: ins.filter(function(n) { return !n.is_read; }).length });
                    return g;
                }
                var today = [], earlier = [];
                this.items.forEach(function(n) {
                    (window.NexusUtils && NexusUtils.notify && NexusUtils.notify.isToday(n.created_at) ? today : earlier).push(n);
                });
                var gg = [];
                if (today.length) gg.push({ label: '今天', items: today });
                if (earlier.length) gg.push({ label: '更早', items: earlier });
                return gg;
            },
            emptyText: function() {
                if (this.filter === 'unread') return '没有未读通知，都处理完了';
                return '还没有通知';
            }
        },
        watch: {
            authed: function (val) {
                if (val) this.startPolling();
                else this.stopPolling();
            }
        },
        mounted: function() {
            this.readToken();
            this._onAuthChange = this.readToken.bind(this);
            window.addEventListener('uc:authchange', this._onAuthChange);
            window.addEventListener('storage', this._onAuthChange);
            this._onVisibility = this.onVisibility.bind(this);
            document.addEventListener('visibilitychange', this._onVisibility);
            this._onKeydown = this.onKeydown.bind(this);
            document.addEventListener('keydown', this._onKeydown);
            if (this.authed) this.startPolling();
            document.addEventListener('click', this.onDocClick);
        },
        beforeUnmount: function() {
            this.stopPolling();
            window.removeEventListener('uc:authchange', this._onAuthChange);
            window.removeEventListener('storage', this._onAuthChange);
            document.removeEventListener('visibilitychange', this._onVisibility);
            document.removeEventListener('keydown', this._onKeydown);
            document.removeEventListener('click', this.onDocClick);
        },
        methods: {
            readToken: function() {
                try {
                    var v = NexusUtils.createDualStorage('uc_access_token').getItem('uc_access_token') || '';
                    if (v !== this.token) this.token = v;
                } catch (e) {}
            },
            startPolling: function() {
                if (this.timer || document.hidden) return;
                this.refresh();
                var self = this;
                this.timer = setInterval(function() { self.refresh(); }, this.pollInterval);
            },
            stopPolling: function() {
                if (this.timer) { clearInterval(this.timer); this.timer = null; }
            },
            onVisibility: function() {
                if (!this.authed) return;
                if (document.hidden) { this.stopPolling(); return; }
                this.refresh();
                if (!this.timer) this.startPolling();
            },
            onKeydown: function(e) {
                if (e.key === 'Escape' && this.open) {
                    this.open = false;
                    var bell = this.$el && this.$el.querySelector('.nux-notify-bell');
                    if (bell) bell.focus();
                }
            },
            tone: function(item) { return NexusUtils.notify.typeTone(item.type); },
            icon: function(item) { return NexusUtils.notify.typeIcon(item.type); },
            fetchJson: function(url, options) {
                var self = this;
                var opts = options || {};
                var headers = Object.assign({ 'Authorization': 'Bearer ' + self.token }, opts.headers || {});
                return fetch(self.baseUrl + url, Object.assign({}, opts, { headers: headers })).then(function(r) {
                    if (!r.ok) {
                        var err = new Error('请求失败');
                        err.status = r.status;
                        throw err;
                    }
                    return r.json();
                });
            },
            refresh: function() {
                var self = this;
                if (!self.authed) return;
                self.refreshBadge();
                if (self.open) self.loadList();
            },
            refreshBadge: function() {
                var self = this;
                self.fetchJson('/api/notify/unread-count').then(function(d) {
                    self.unread = (d && typeof d.count === 'number') ? d.count : 0;
                }).catch(function() {});
            },
            onOpen: function() {
                this.open = !this.open;
                if (this.open) {
                    this.filter = this.unread > 0 ? 'unread' : 'all';
                    this.loadList();
                }
            },
            setFilter: function(f) {
                if (this.filter === f) return;
                this.filter = f;
                this.loadList();
            },
            listUrl: function() {
                var url = '/api/notify/notifications?page=1&page_size=' + this.maxVisible;
                if (this.filter === 'unread') url += '&is_read=false';
                return url;
            },
            loadList: function() {
                var self = this;
                if (!self.authed) return;
                var seq = ++self.listSeq;
                self.loading = true;
                self.error = '';
                self.fetchJson(self.listUrl()).then(function(d) {
                    if (seq !== self.listSeq) return;
                    self.items = (d && Array.isArray(d.items)) ? d.items : [];
                    self.total = (d && typeof d.total === 'number') ? d.total : self.items.length;
                }).catch(function(e) {
                    if (seq !== self.listSeq) return;
                    self.error = '通知加载失败';
                    if (e && e.status === 404) self.unread = 0;
                }).finally(function() {
                    if (seq === self.listSeq) self.loading = false;
                });
            },
            markAllRead: function(box) {
                var self = this;
                var url = '/api/notify/read-all';
                if (box) url += '?box=' + encodeURIComponent(box);
                self.fetchJson(url, { method: 'PUT' }).catch(function() {});
                self.items.forEach(function(i) { i.is_read = true; });
                self.unread = 0;
            },
            activate: function(item) {
                var self = this;
                if (!item.is_read) {
                    self.fetchJson('/api/notify/' + item.id + '/read', { method: 'PUT' }).catch(function() {});
                    item.is_read = true;
                    self.refreshBadge();
                    if (self.filter === 'unread') {
                        self.items = self.items.filter(function(n) { return n.id !== item.id; });
                        self.total = Math.max(0, self.total - 1);
                    }
                }
                var url = this.resolveLink(item);
                if (url) window.location.href = url;
                this.open = false;
            },
            resolveLink: function(item) {
                if (window.NexusUtils && NexusUtils.notify) return NexusUtils.notify.resolve(item);
                return '';
            },
            appLabel: function(appId) {
                return NexusUtils.notify ? NexusUtils.notify.appLabel(appId) : (appId || '');
            },
            relTime: function(iso) {
                if (!iso) return '';
                return window.NexusUtils ? NexusUtils.formatRelativeTime(iso) : String(iso);
            },
            summary: function(content) {
                return NexusUtils.notify ? NexusUtils.notify.clip(content, 80) : '';
            },
            onDocClick: function(e) {
                if (this.$el && !this.$el.contains(e.target)) this.open = false;
            }
        },
        template: `
            <div class="nux-notify" :class="{open: open}">
                <button type="button" class="nux-notify-bell" aria-haspopup="dialog" :aria-expanded="open ? 'true' : 'false'" aria-controls="nux-notify-panel" :aria-label="unread > 0 ? (title + '，' + unread + ' 条新通知') : title" @click.stop="onOpen">
                    <i class="fa-regular fa-bell" aria-hidden="true"></i>
                    <span v-if="unread > 0" class="nux-notify-dot">{{ unread > 99 ? '99+' : unread }}</span>
                </button>
                <span class="nux-notify-live" role="status" aria-live="polite">{{ unread > 0 ? (unread + ' 条新通知') : '' }}</span>
                <div v-if="open" id="nux-notify-panel" class="nux-notify-panel" role="dialog" :aria-label="title" @click.stop>
                    <div class="nux-notify-head">
                        <span class="nux-notify-title">{{ title }}</span>
                        <button type="button" class="nux-notify-allread" v-if="hasUnreadItems" @click.stop="markAllRead">全部已读</button>
                    </div>
                    <div class="nux-notify-toolbar" v-if="!loading && !error">
                        <div class="nux-notify-seg" role="tablist" :aria-label="title + '筛选'">
                            <button type="button" role="tab" :aria-selected="filter === 'unread' ? 'true' : 'false'" :class="['nux-notify-seg-btn', {active: filter === 'unread'}]" @click.stop="setFilter('unread')">未读</button>
                            <button type="button" role="tab" :aria-selected="filter === 'all' ? 'true' : 'false'" :class="['nux-notify-seg-btn', {active: filter === 'all'}]" @click.stop="setFilter('all')">全部</button>
                        </div>
                    </div>
                    <div v-if="loading" class="nux-notify-empty"><span class="nx-spinner" aria-hidden="true"></span>加载中…</div>
                    <div v-else-if="error" class="nux-notify-empty">
                        <i class="fa-regular fa-bell-slash nux-notify-empty-ic" aria-hidden="true"></i>
                        <span>{{ error }}</span>
                        <button type="button" class="nux-notify-reload" @click.stop="loadList">重新加载</button>
                    </div>
                    <div v-else-if="!items.length" class="nux-notify-empty">
                        <i class="fa-regular fa-bell-slash nux-notify-empty-ic" aria-hidden="true"></i>
                        <span>{{ emptyText }}</span>
                    </div>
                    <div v-else class="nux-notify-scroll">
                        <div v-for="g in groups" :key="g.label" class="nux-notify-group">
                            <div class="nux-notify-group-label">{{ g.label }}<span v-if="g.unread" class="nux-notify-group-unread">{{ g.unread }} 条未读</span></div>
                            <ul class="nux-notify-list">
                                <li v-for="item in g.items" :key="item.id" :class="['nux-notify-item', 'tone-' + tone(item), { 'nux-notify-item-unread': !item.is_read }]" role="button" tabindex="0" :aria-label="item.title" @click="activate(item)" @keydown.enter.prevent="activate(item)" @keydown.space.prevent="activate(item)">
                                    <span class="nux-notify-item-ic" aria-hidden="true"><i :class="icon(item)"></i></span>
                                    <span class="nux-notify-item-main">
                                        <span class="nux-notify-item-title">{{ item.title }}</span>
                                        <span v-if="item.content" class="nux-notify-item-summary">{{ summary(item.content) }}</span>
                                        <span class="nux-notify-item-meta">
                                            <span class="nux-notify-item-app">{{ appLabel(item.app_id) }}</span>
                                            <span class="nux-notify-item-time">{{ relTime(item.created_at) }}</span>
                                        </span>
                                    </span>
                                    <span v-if="!item.is_read" class="nux-notify-item-dot" aria-hidden="true"></span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div v-if="!loading && !error && centerUrl && items.length" class="nux-notify-foot">
                        <a class="nux-notify-center" :href="centerUrl">查看全部通知<i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>
                        <span v-if="hiddenCount > 0" class="nux-notify-foot-hint">还有 {{ hiddenCount }} 条</span>
                    </div>
                    <div v-else-if="!loading && !error && items.length" class="nux-notify-foot">
                        <span>共 {{ total }} 条</span>
                    </div>
                </div>
            </div>
        `
    };
    window.NuxNotificationBell = NuxNotificationBell;
})();
