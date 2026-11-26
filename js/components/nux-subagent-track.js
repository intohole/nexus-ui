(function () {
    'use strict';

    var RUNNING_SET = { running: 1, started: 1, executing: 1, in_progress: 1, pending: 1 };
    var SUSPENDED_SET = { suspended: 1, waiting: 1, awaiting_input: 1 };
    var ERROR_SET = { error: 1, failed: 1, failure: 1 };

    // 与 js/nexus-subagent.js 同词表（组件按需独立引入时不依赖其加载）。
    // suspended = 中性「等待输入」，不是 error。
    function normalizeStatus(status) {
        var s = String(status || '').toLowerCase();
        if (RUNNING_SET[s]) return 'running';
        if (SUSPENDED_SET[s]) return 'suspended';
        if (ERROR_SET[s]) return 'error';
        return 'done';
    }

    function formatDuration(ms) {
        var n = Number(ms) || 0;
        if (n <= 0) return '';
        if (n < 1000) return n + 'ms';
        return (n / 1000).toFixed(1).replace(/\.0$/, '') + 's';
    }

    function truncate(text, max) {
        var s = String(text == null ? '' : text);
        return s.length > max ? s.slice(0, max) + '…（已截断）' : s;
    }

    function entryLabel(item) {
        return item.label || item.name || item.title || item.id || '子代理';
    }

    function entryStatus(item) {
        return normalizeStatus(item.status);
    }

    var STATUS_TEXT = {
        running: '执行中',
        done: '已完成',
        suspended: '等待输入',
        error: '执行失败'
    };

    var NuxSubagentTrack = {
        name: 'NuxSubagentTrack',
        props: {
            items: { type: Array, default: function () { return []; } },
            activities: { type: Array, default: function () { return []; } }
        },
        data: function () {
            return { expanded: {} };
        },
        computed: {
            views: function () {
                var self = this;
                var acts = this.activities || [];
                function actsFor(saId) {
                    return acts.filter(function (a) { return (a.subagentRunId || '') === saId; });
                }
                function activityLine(a) {
                    var c = a.content;
                    var brief = (c != null && typeof c === 'object')
                        ? truncate(JSON.stringify(c).replace(/\s+/g, ' '), 160)
                        : truncate(String(c == null ? '' : c), 160);
                    return (a.activityType || 'activity') + '：' + brief;
                }
                return (this.items || []).map(function (item, i) {
                    var status = entryStatus(item);
                    var tools = item.toolCalls || [];
                    var thinking = String(item.thinking || '').trim();
                    var summary = STATUS_TEXT[status] || STATUS_TEXT.done;
                    if (status === 'error' && item.error) summary = truncate(item.error, 120);
                    var itemActs = actsFor(item.id || '');
                    var lastAct = itemActs.length ? itemActs[itemActs.length - 1] : null;
                    var detailParts = [];
                    if (thinking) detailParts.push(truncate(thinking, 400));
                    if (tools.length) {
                        var last = tools[tools.length - 1] || {};
                        detailParts.push('工具调用 ' + tools.length + ' 次（最近：' + (last.name || '未知') + '）');
                    }
                    if (itemActs.length) {
                        detailParts.push.apply(detailParts, itemActs.slice(-3).map(activityLine));
                        if (itemActs.length > 3) detailParts.push('…共 ' + itemActs.length + ' 条进度');
                    }
                    if (item.interrupts && item.interrupts.length) {
                        detailParts.push('挂起等待人工输入');
                    }
                    return {
                        key: item.id || ('s' + i),
                        label: entryLabel(item),
                        status: status,
                        running: status === 'running',
                        suspended: status === 'suspended',
                        error: status === 'error',
                        summary: summary,
                        progress: (status === 'running' && lastAct) ? activityLine(lastAct) : '',
                        duration: status === 'running' ? '' : formatDuration(item.durationMs),
                        detail: detailParts.join('\n'),
                        expandable: status !== 'running' && !!detailParts.length
                    };
                });
            },
            runningCount: function () {
                return this.views.filter(function (v) { return v.running; }).length;
            }
        },
        methods: {
            toggle: function (view) {
                if (!view.expandable) return;
                this.expanded[view.key] = !this.expanded[view.key];
            },
            isOpen: function (view) {
                return !!this.expanded[view.key];
            }
        },
        template: `
            <ol class="nx-subagent-track" v-if="views.length" :data-running="runningCount > 0 ? '1' : '0'">
                <li v-for="v in views" :key="v.key" class="nx-subagent-track-item" :class="['is-' + v.status, { 'is-open': isOpen(v) }]">
                    <button type="button" class="nx-subagent-track-row" :aria-expanded="isOpen(v) ? 'true' : 'false'" :disabled="!v.expandable" @click="toggle(v)">
                        <span v-if="v.running" class="nx-subagent-track-spinner" aria-hidden="true"></span>
                        <span v-else-if="v.error" class="nx-subagent-track-mark is-error" aria-hidden="true">✕</span>
                        <span v-else-if="v.suspended" class="nx-subagent-track-mark is-suspended" aria-hidden="true">⏸</span>
                        <span v-else class="nx-subagent-track-mark is-done" aria-hidden="true">✓</span>
                        <span class="nx-subagent-track-name">{{ v.label }}</span>
                        <span class="nx-subagent-track-summary" :class="{ 'is-error': v.error }">{{ v.progress || v.summary }}</span>
                        <span v-if="v.duration" class="nx-subagent-track-duration">{{ v.duration }}</span>
                        <svg v-if="v.expandable" class="nx-subagent-track-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div v-if="isOpen(v) && v.expandable" class="nx-subagent-track-detail">
                        <pre class="nx-subagent-track-detail-body"><code>{{ v.detail }}</code></pre>
                    </div>
                </li>
            </ol>
        `
    };

    window.NuxSubagentTrack = NuxSubagentTrack;
})();
