(function () {
    'use strict';

    var RUNNING_SET = { running: 1, streaming: 1, in_progress: 1, active: 1 };
    var ERROR_SET = { error: 1, failed: 1, failure: 1 };
    var INTERRUPTED_SET = { interrupted: 1, stopped: 1, stopped_partial: 1, stoppedpartial: 1, cancelled: 1, lost: 1 };

    // 与 NexusStop 四态终态对表：done/interrupted/error，streaming 为在途。
    function normalizeStatus(status) {
        var s = String(status || '').toLowerCase();
        if (RUNNING_SET[s]) return 'running';
        if (ERROR_SET[s]) return 'error';
        if (INTERRUPTED_SET[s]) return 'interrupted';
        return 'done';
    }

    function formatDuration(ms) {
        var n = Number(ms) || 0;
        if (n <= 0) return '';
        if (n < 1000) return n + 'ms';
        if (n < 60000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 's';
        return Math.floor(n / 60000) + 'm' + Math.round((n % 60000) / 1000) + 's';
    }

    function formatTokens(n) {
        n = Number(n) || 0;
        if (n <= 0) return '';
        if (n < 1000) return String(n);
        if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return (n / 1000000).toFixed(2) + 'M';
    }

    function num(v) {
        if (v == null || v === '') return 0;
        if (typeof v === 'number') return v;
        var n = parseInt(v, 10);
        return isNaN(n) ? 0 : n;
    }

    // 跨消息聚合：按 runId/threadId 分组，消息序遍历累计 tokens/工具/子代理/终态。
    // msg 字段面 = routeRichEvent 落点（meta.toolCalls/subagents/error/streaming/stopped*）。
    function collect(messages) {
        var groups = {};
        var order = [];
        (messages || []).forEach(function (msg) {
            if (!msg || msg.role === 'user') return;
            var meta = msg.meta || {};
            var runId = meta.runId || meta.threadId || msg.runId || msg.id || 'run';
            if (!groups[runId]) {
                groups[runId] = {
                    id: runId,
                    label: meta.label || (String(runId).length > 18 ? String(runId).slice(0, 18) + '…' : String(runId)),
                    tokens: 0,
                    toolCount: 0,
                    subagentCount: 0,
                    turns: 0,
                    durationMs: 0,
                    status: 'done',
                    startedAt: meta.startedAt || msg.time || '',
                    endedAt: ''
                };
                order.push(runId);
            }
            var g = groups[runId];
            g.turns++;
            g.tokens += num(meta.tokens != null ? meta.tokens : (meta.usage && (meta.usage.total_tokens || meta.usage.totalTokens)));
            g.toolCount += Math.max(num(meta.toolCount), (msg.toolCalls || []).length);
            g.subagentCount = Math.max(g.subagentCount, (msg.subagents || []).length, num(meta.subagentCount));
            var dur = num(meta.durationMs != null ? meta.durationMs : meta.elapsedMs);
            if (dur > g.durationMs) g.durationMs = dur;
            if (meta.endedAt || meta.time) g.endedAt = meta.endedAt || meta.time;
            if (msg.error || meta.status === 'error') g.status = 'error';
            else if (msg.streaming || meta.status === 'running' || meta.status === 'streaming') { if (g.status !== 'error') g.status = 'running'; }
            else if (msg.stopped || msg.stoppedPartial || msg.stoppedEmpty || msg.interrupted || INTERRUPTED_SET[String(meta.status || '').toLowerCase()]) { if (g.status === 'done') g.status = 'interrupted'; }
            if (meta.raw && typeof meta.raw === 'object') g.raw = meta.raw;
        });
        return order.map(function (id) { return groups[id]; });
    }

    var STATUS_TEXT = {
        running: '进行中',
        done: '已完成',
        interrupted: '已中断',
        error: '失败'
    };

    var NuxRunTelemetry = {
        name: 'NuxRunTelemetry',
        props: {
            runs: { type: Array, default: function () { return []; } },
            messages: { type: Array, default: null },
            title: { type: String, default: '运行遥测' },
            collapsible: { type: Boolean, default: true }
        },
        emits: [],
        data: function () {
            return { expanded: {} };
        },
        computed: {
            sourceRuns: function () {
                return (this.messages && this.messages.length ? collect(this.messages) : this.runs) || [];
            },
            views: function () {
                return this.sourceRuns.map(function (run, i) {
                    var status = normalizeStatus(run.status);
                    var tokens = num(run.tokens);
                    var detailParts = [];
                    if (run.startedAt) detailParts.push('开始：' + run.startedAt);
                    detailParts.push('轮次：' + num(run.turns));
                    if (run.raw) detailParts.push('meta：' + JSON.stringify(run.raw));
                    return {
                        key: run.id || ('r' + i),
                        label: run.label || run.id || ('run-' + (i + 1)),
                        status: status,
                        running: status === 'running',
                        error: status === 'error',
                        interrupted: status === 'interrupted',
                        statusText: STATUS_TEXT[status] || STATUS_TEXT.done,
                        tokens: tokens > 0 ? formatTokens(tokens) : '',
                        duration: formatDuration(run.durationMs),
                        toolCount: num(run.toolCount),
                        subagentCount: num(run.subagentCount),
                        turns: num(run.turns),
                        detail: detailParts.join('\n')
                    };
                });
            },
            totalTokens: function () {
                var n = this.sourceRuns.reduce(function (s, r) { return s + num(r.tokens); }, 0);
                return n > 0 ? formatTokens(n) : '';
            }
        },
        methods: {
            toggle: function (view) {
                if (!view.detail) return;
                this.expanded[view.key] = !this.expanded[view.key];
            },
            isOpen: function (view) { return !!this.expanded[view.key]; }
        },
        template: `
            <section class="nx-run-tel" :data-nux-telemetry="views.length" aria-label="运行遥测">
                <header class="nx-run-tel-head">
                    <span class="nx-run-tel-title">{{ title }}</span>
                    <span class="nx-run-tel-sum">{{ views.length }} 次<template v-if="totalTokens"> · {{ totalTokens }} tokens</template></span>
                </header>
                <ol class="nx-run-tel-list">
                    <li v-for="v in views" :key="v.key" class="nx-run-tel-item" :class="['is-' + v.status, { 'is-open': isOpen(v) }]">
                        <button type="button" class="nx-run-tel-row" :aria-expanded="isOpen(v) ? 'true' : 'false'" :disabled="!v.detail" @click="toggle(v)">
                            <span v-if="v.running" class="nx-run-tel-spinner" aria-hidden="true"></span>
                            <span v-else-if="v.error" class="nx-run-tel-mark is-error" aria-hidden="true">✕</span>
                            <span v-else-if="v.interrupted" class="nx-run-tel-mark is-interrupted" aria-hidden="true">⏹</span>
                            <span v-else class="nx-run-tel-mark is-done" aria-hidden="true">✓</span>
                            <span class="nx-run-tel-name">{{ v.label }}</span>
                            <span class="nx-run-tel-status" :class="{ 'is-error': v.error }">{{ v.statusText }}</span>
                            <span v-if="v.tokens" class="nx-run-tel-chip">{{ v.tokens }} tok</span>
                            <span v-if="v.toolCount" class="nx-run-tel-chip">{{ v.toolCount }} 工具</span>
                            <span v-if="v.subagentCount" class="nx-run-tel-chip">{{ v.subagentCount }} 席</span>
                            <span v-if="v.duration" class="nx-run-tel-duration">{{ v.duration }}</span>
                            <svg v-if="v.detail" class="nx-run-tel-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        <div v-if="isOpen(v) && v.detail" class="nx-run-tel-detail">
                            <pre class="nx-run-tel-detail-body"><code>{{ v.detail }}</code></pre>
                        </div>
                    </li>
                </ol>
            </section>
        `
    };

    // 消息内 widget 型注册（type=telemetry）：只读展示面，无动作事件。
    var registry = window.NuxAiWidgetsRegistry || (window.NuxAiWidgetsRegistry = {});
    registry.types = registry.types || {};
    registry.icons = registry.icons || {};
    if (!registry.register) {
        registry.register = function (type, def, icon) {
            registry.types[type] = def;
            if (icon) registry.icons[type] = icon;
        };
    }
    registry.register('telemetry', {
        name: 'NuxTelemetryWidget',
        components: { 'nux-run-telemetry': NuxRunTelemetry },
        props: { data: { type: Object, default: function () { return {}; } } },
        emits: [],
        template: `<nux-run-telemetry :runs="data.runs || []" :title="data.title || '运行遥测'"
            :collapsible="data.collapsible !== false"></nux-run-telemetry>`
    }, '📊');

    NuxRunTelemetry.collect = collect;
    window.NuxRunTelemetry = NuxRunTelemetry;
})();
