(function () {
    'use strict';

    var RUNNING_SET = { running: 1, executing: 1, in_progress: 1, pending: 1 };
    var ERROR_SET = { error: 1, failed: 1, failure: 1, cancelled: 1 };

    function normalizeStatus(status, detail) {
        var s = String(status || '').toLowerCase();
        if (RUNNING_SET[s]) return 'running';
        if (ERROR_SET[s]) return 'error';
        if (detail) return 'done';
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

    function stringifyValue(value) {
        if (value == null) return '';
        if (typeof value === 'string') return value;
        try { return JSON.stringify(value, null, 2); } catch (e) { return String(value); }
    }

    function entryLabel(item) {
        return item.label || item.display_name || item.name || item.tool || '工具调用';
    }

    function entryStatus(item) {
        return normalizeStatus(item.status, item.result !== undefined && item.result !== null && item.result !== '' || item.error);
    }

    function argPairs(args) {
        if (args == null || args === '') return [];
        if (typeof args === 'string') return [{ k: '入参', v: args }];
        if (typeof args !== 'object') return [{ k: '入参', v: String(args) }];
        var keys = Object.keys(args);
        if (!keys.length) return [];
        return keys.map(function (k) {
            var v = args[k];
            return { k: k, v: truncate(typeof v === 'string' ? v : stringifyValue(v).replace(/\s+/g, ' '), 160) };
        });
    }

    var NuxToolCall = {
        name: 'NuxToolCall',
        props: {
            items: { type: Array, default: function () { return []; } }
        },
        data: function () {
            return { expanded: {} };
        },
        computed: {
            views: function () {
                var self = this;
                return (this.items || []).map(function (item, i) {
                    var status = entryStatus(item);
                    return {
                        key: item.id || ('c' + i),
                        label: entryLabel(item),
                        status: status,
                        running: status === 'running',
                        error: status === 'error',
                        errorText: item.error ? truncate(item.error, 300) : '',
                        summary: status === 'running' ? '正在执行…' : (formatDuration(item.duration_ms) || (status === 'error' ? '执行失败' : '已完成')),
                        args: argPairs(item.args !== undefined ? item.args : item.input),
                        result: item.result != null && item.result !== '' ? truncate(stringifyValue(item.result), 2000) : '',
                        expandable: status !== 'running' && !!(item.error || item.result != null || item.args != null)
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
            <ol class="nx-tool-call" v-if="views.length" :data-running="runningCount > 0 ? '1' : '0'">
                <li v-for="v in views" :key="v.key" class="nx-tool-call-item" :class="['is-' + v.status, { 'is-open': isOpen(v) }]">
                    <button type="button" class="nx-tool-call-row" :aria-expanded="isOpen(v) ? 'true' : 'false'" :disabled="!v.expandable" @click="toggle(v)">
                        <span v-if="v.running" class="nx-tool-call-spinner" aria-hidden="true"></span>
                        <span v-else-if="v.error" class="nx-tool-call-mark nx-tool-call-mark--error" aria-hidden="true">✕</span>
                        <span v-else class="nx-tool-call-mark nx-tool-call-mark--done" aria-hidden="true">✓</span>
                        <span class="nx-tool-call-name">{{ v.label }}</span>
                        <span class="nx-tool-call-summary" :class="{ 'is-error': v.error }">{{ v.errorText || v.summary }}</span>
                        <svg v-if="v.expandable" class="nx-tool-call-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div v-if="isOpen(v) && v.expandable" class="nx-tool-call-detail">
                        <dl v-if="v.args.length" class="nx-tool-call-args">
                            <div v-for="p in v.args" :key="p.k" class="nx-tool-call-arg">
                                <dt>{{ p.k }}</dt><dd>{{ p.v }}</dd>
                            </div>
                        </dl>
                        <pre v-if="v.result" class="nx-tool-call-result"><code>{{ v.result }}</code></pre>
                    </div>
                </li>
            </ol>
        `
    };

    window.NuxToolCall = NuxToolCall;
})();
