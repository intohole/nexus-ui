/* nux-notification-digest —— 收件箱行动化 digest 原语（r26）。
 *
 * 三形态一体：
 * - fetch(apiBase, fetchJson)        拉取 inbox-digest（fail-open 返回 null）
 * - NuxNotificationDigestPanel       Vue 子组件（bell 弹层主消费面）
 * - attach(panel) / reportClick      原生 panel 消费面（resumeAI）接线原语
 *
 * 语义：digest 是呈现层聚合——行动项逐条置顶、周期流折叠成卡（count+最新标题），
 * 不动已读状态；点击统一走 reportClick 记 click_at（幂等）。
 */
(function () {
    'use strict';

    function esc(v) {
        return window.NexusUtils ? window.NexusUtils.escapeHtml(v) : String(v == null ? '' : v);
    }
    function relTime(ts) {
        return (ts && window.NexusUtils) ? window.NexusUtils.formatRelativeTime(ts) : '';
    }
    function appLabel(appId) {
        return window.NexusUtils && NexusUtils.notify ? NexusUtils.notify.appLabel(appId) : (appId || '');
    }

    function fetch(apiBase, fetchJson) {
        return fetchJson((apiBase || '') + '/notifications/inbox-digest')
            .then(function (d) {
                return (d && d.counts && d.counts.unread_total > 0) ? d : null;
            })
            .catch(function () { return null; });
    }

    function reportClick(apiBase, fetchJson, id) {
        if (!id) return;
        fetchJson((apiBase || '') + '/notifications/' + id + '/click', { method: 'POST' })
            .catch(function () {});
    }

    var NuxNotificationDigestPanel = {
        name: 'nux-notification-digest',
        props: {
            digest: { type: Object, default: null },
            apiBase: { type: String, default: '' },
            fetchJson: { type: Function, required: true }
        },
        data: function () {
            return { openStream: '', streamItems: [], streamLoading: false, seq: 0 };
        },
        computed: {
            hasAction: function () { return !!(this.digest && this.digest.action_items && this.digest.action_items.length); },
            hasStreams: function () { return !!(this.digest && this.digest.streams && this.digest.streams.length); },
            counts: function () { return (this.digest && this.digest.counts) || {}; }
        },
        methods: {
            streamKey: function (s) { return s.app_id + ':' + s.notif_type; },
            relTime: relTime,
            appLabel: appLabel,
            toggleStream: function (s) {
                var self = this;
                var key = self.streamKey(s);
                if (self.openStream === key) { self.openStream = ''; self.streamItems = []; return; }
                var seq = ++self.seq;
                self.openStream = key;
                self.streamLoading = true;
                self.streamItems = [];
                var url = (self.apiBase || '') + '/notifications/stream-items?app_id=' +
                    encodeURIComponent(s.app_id) + '&notif_type=' + encodeURIComponent(s.notif_type);
                self.fetchJson(url).then(function (d) {
                    if (seq !== self.seq) return;
                    self.streamItems = (d && Array.isArray(d.items)) ? d.items : [];
                }).catch(function () {
                    if (seq === self.seq) self.streamItems = [];
                }).finally(function () {
                    if (seq === self.seq) self.streamLoading = false;
                });
            },
            activate: function (item) {
                this.$emit('activate', item);
            },
            clip: function (content) {
                return window.NexusUtils && NexusUtils.notify ? NexusUtils.notify.clip(content, 60) : '';
            }
        },
        template: '' +
            '<div v-if="hasAction || hasStreams" class="nux-notify-digest">' +
            '  <div v-if="hasAction" class="nux-notify-digest-seg">' +
            '    <div class="nux-notify-digest-label">待你处理<span v-if="counts.action_unread" class="nux-notify-digest-n">{{ counts.action_unread }}</span></div>' +
            '    <ul class="nux-notify-list">' +
            '      <li v-for="item in digest.action_items" :key="\'a\' + item.id" :class="[\'nux-notify-item\', \'nux-notify-item-unread\']" role="button" tabindex="0" :aria-label="item.title" @click="activate(item)" @keydown.enter.prevent="activate(item)">' +
            '        <span class="nux-notify-item-main">' +
            '          <span class="nux-notify-item-title">{{ item.title }}</span>' +
            '          <span class="nux-notify-item-meta"><span class="nux-notify-item-app">{{ item.app_id }}</span><span class="nux-notify-item-time">{{ relTime(item.created_at) }}</span></span>' +
            '        </span>' +
            '        <span class="nux-notify-item-dot" aria-hidden="true"></span>' +
            '      </li>' +
            '    </ul>' +
            '    <div v-if="counts.action_hidden > 0" class="nux-notify-digest-hint">还有 {{ counts.action_hidden }} 条待处理，见下方全部列表</div>' +
            '  </div>' +
            '  <div v-if="hasStreams" class="nux-notify-digest-seg">' +
            '    <div class="nux-notify-digest-label">今日简报<span v-if="counts.stream_unread" class="nux-notify-digest-n">{{ counts.stream_unread }}</span></div>' +
            '    <ul class="nux-notify-list">' +
            '      <li v-for="s in digest.streams" :key="streamKey(s)" class="nux-notify-stream">' +
            '        <div class="nux-notify-stream-head" role="button" tabindex="0" :aria-expanded="openStream === streamKey(s) ? \'true\' : \'false\'" :aria-label="appLabel(s.app_id) + \' \' + s.count + \' 条\'" @click="toggleStream(s)" @keydown.enter.prevent="toggleStream(s)">' +
            '          <span class="nux-notify-stream-app">{{ appLabel(s.app_id) }}</span>' +
            '          <span class="nux-notify-stream-title">{{ s.latest_title }}</span>' +
            '          <span class="nux-notify-stream-count">{{ s.count }} 条</span>' +
            '          <i :class="openStream === streamKey(s) ? \'fa-solid fa-chevron-up\' : \'fa-solid fa-chevron-down\'" aria-hidden="true"></i>' +
            '        </div>' +
            '        <ul v-if="openStream === streamKey(s)" class="nux-notify-stream-body">' +
            '          <li v-if="streamLoading" class="nux-notify-stream-loading"><span class="nx-spinner" aria-hidden="true"></span></li>' +
            '          <li v-for="item in streamItems" :key="item.id" class="nux-notify-stream-item" role="button" tabindex="0" :aria-label="item.title" @click="activate(item)" @keydown.enter.prevent="activate(item)">' +
            '            <span class="nux-notify-stream-item-title">{{ item.title }}</span>' +
            '            <span v-if="item.content" class="nux-notify-stream-item-sum">{{ clip(item.content) }}</span>' +
            '            <span class="nux-notify-item-time">{{ relTime(item.created_at) }}</span>' +
            '          </li>' +
            '        </ul>' +
            '      </li>' +
            '    </ul>' +
            '  </div>' +
            '  <div v-if="counts.folded_unread > 0" class="nux-notify-digest-hint">另有 {{ counts.folded_unread }} 条未读，见下方全部列表</div>' +
            '</div>'
    };

    function attach(panel) {
        var container = panel && panel._container;
        if (!container || !panel._digest) return;
        var list = container.querySelector('.nux-notif-panel-list');
        if (!list) return;
        list.querySelector('.nux-notif-digest-seg-wrap') &&
            list.querySelector('.nux-notif-digest-seg-wrap').remove();
        if (panel._box !== 'inbox' || panel._filter !== 'all') return;
        var d = panel._digest;
        var html = '<div class="nux-notif-digest-seg-wrap">';
        if (d.action_items && d.action_items.length) {
            html += '<div class="nux-notif-digest-seg"><div class="nux-notify-digest-label">待你处理<span class="nux-notify-digest-n">' + d.counts.action_unread + '</span></div>';
            html += d.action_items.map(function (n) { return panel._item(n); }).join('');
            html += '</div>';
        }
        if (d.streams && d.streams.length) {
            html += '<div class="nux-notif-digest-seg"><div class="nux-notify-digest-label">今日简报<span class="nux-notify-digest-n">' + d.counts.stream_unread + '</span></div>';
            html += '<ul class="nux-notif-digest-streams">' + d.streams.map(function (s) {
                return '<li class="nux-notif-digest-stream" data-stream-app="' + esc(s.app_id) + '" data-stream-type="' + esc(s.notif_type) + '" role="button" tabindex="0" aria-expanded="false">' +
                    '<span class="nux-notify-stream-app">' + esc(appLabel(s.app_id)) + '</span>' +
                    '<span class="nux-notify-stream-title">' + esc(s.latest_title) + '</span>' +
                    '<span class="nux-notify-stream-count">' + s.count + ' 条</span>' +
                    '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></li>';
            }).join('') + '</ul></div>';
        }
        if (d.counts.folded_unread > 0) {
            html += '<div class="nux-notify-digest-hint">另有 ' + d.counts.folded_unread + ' 条未读，见下方全部列表</div>';
        }
        html += '</div>';
        list.insertAdjacentHTML('afterbegin', html);
    }

    function sync(panel) {
        var api = panel._getApi();
        fetch(panel._baseUrl, function (url) { return api.get(url); }).then(function (d) {
            panel._digest = d;
            attach(panel);
        });
    }

    window.NuxNotificationDigest = {
        fetch: fetch,
        reportClick: reportClick,
        attach: attach,
        sync: sync,
        panel: NuxNotificationDigestPanel
    };
    window.NuxNotificationDigestPanel = NuxNotificationDigestPanel;
})();
