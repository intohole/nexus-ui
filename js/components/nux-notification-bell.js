(function() {
    const TOKEN_KEY = 'uc_access_token';
    const NuxNotificationBell = {
        name: 'nux-notification-bell',
        props: {
            baseUrl: { type: String, default: '/notifycenter' },
            pollInterval: { type: Number, default: 60000 },
            maxVisible: { type: Number, default: 10 },
            title: { type: String, default: '消息通知' }
        },
        data: function() {
            return {
                open: false,
                unread: 0,
                items: [],
                loading: false,
                error: '',
                timer: null
            };
        },
        computed: {
            token: function() {
                try {
                    return NexusUtils.createDualStorage('uc_access_token').getItem('uc_access_token') || '';
                } catch (e) { return ''; }
            },
            authed: function() { return !!this.token; }
        },
        mounted: function() {
            if (!this.authed) return;
            this.refresh();
            this.timer = setInterval(this.refresh, this.pollInterval);
            document.addEventListener('click', this.onDocClick);
        },
        beforeUnmount: function() {
            if (this.timer) clearInterval(this.timer);
            document.removeEventListener('click', this.onDocClick);
        },
        methods: {
            fetchJson: function(url, options) {
                var self = this;
                var opts = options || {};
                var headers = Object.assign({ 'Authorization': 'Bearer ' + self.token }, opts.headers || {});
                return fetch(self.baseUrl + url, Object.assign({}, opts, { headers: headers })).then(function(r) {
                    if (!r.ok) throw new Error('请求失败');
                    return r.json();
                });
            },
            refresh: function() {
                var self = this;
                if (!self.authed) return;
                self.fetchJson('/api/notify/unread-count').then(function(d) {
                    self.unread = (d && typeof d.count === 'number') ? d.count : 0;
                }).catch(function() {});
                if (self.open && !self.items.length) self.loadList();
            },
            onOpen: function() {
                var self = this;
                self.open = !self.open;
                if (self.open) {
                    self.loadList();
                    if (self.unread > 0) self.refresh();
                }
            },
            loadList: function() {
                var self = this;
                if (!self.authed) return;
                self.loading = true;
                self.error = '';
                self.fetchJson('/api/notify/notifications?page=1&page_size=' + self.maxVisible).then(function(d) {
                    self.items = (d && Array.isArray(d.items)) ? d.items : [];
                }).catch(function() {
                    self.error = '通知加载失败';
                }).finally(function() {
                    self.loading = false;
                });
            },
            markRead: function(item) {
                var self = this;
                if (item.is_read) { self.goto(item); return; }
                self.fetchJson('/api/notify/' + item.id + '/read', { method: 'PUT' }).catch(function() {});
                item.is_read = true;
                self.unread = Math.max(0, self.unread - 1);
                self.goto(item);
            },
            markAllRead: function() {
                var self = this;
                self.fetchJson('/api/notify/read-all', { method: 'PUT' }).catch(function() {});
                self.items.forEach(function(i) { i.is_read = true; });
                self.unread = 0;
            },
            goto: function(item) {
                if (item.link) window.location.href = item.link;
                this.open = false;
            },
            onDocClick: function(e) {
                if (this.$el && !this.$el.contains(e.target)) this.open = false;
            },
            formatTime: function(iso) {
                if (!iso) return '';
                try {
                    var d = new Date(iso);
                    var pad = function(n) { return n < 10 ? '0' + n : String(n); };
                    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
                } catch (e) { return String(iso); }
            }
        },
        template: `
            <div class="nux-notify" :class="{open: open}">
                <button type="button" class="nux-notify-bell" :aria-label="unread > 0 ? (title + '，' + unread + ' 条未读') : title" @click.stop="onOpen">
                    <i class="fa fa-bell"></i>
                    <span v-if="unread > 0" class="nux-notify-dot">{{ unread > 99 ? '99+' : unread }}</span>
                </button>
                <div v-if="open" class="nux-notify-panel" @click.self.stop>
                    <div class="nux-notify-head">
                        <span class="nux-notify-title">{{ title }}</span>
                        <button type="button" class="nux-notify-allread" v-if="unread > 0" @click.stop="markAllRead">全部已读</button>
                    </div>
                    <div v-if="loading" class="nux-notify-empty">加载中…</div>
                    <div v-else-if="error" class="nux-notify-empty">{{ error }}</div>
                    <div v-else-if="!items.length" class="nux-notify-empty">暂无通知</div>
                    <ul v-else class="nux-notify-list">
                        <li v-for="item in items" :key="item.id" :class="['nux-notify-item', { 'nux-notify-item-unread': !item.is_read }]" @click="markRead(item)">
                            <div class="nux-notify-item-title">{{ item.title }}</div>
                            <div class="nux-notify-item-time">{{ formatTime(item.created_at) }}</div>
                        </li>
                    </ul>
                </div>
            </div>
        `
    };
    window.NuxNotificationBell = NuxNotificationBell;
})();