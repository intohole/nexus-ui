(function () {
    'use strict';

    var PENDING_SET = { pending: 1, todo: 1, waiting: 1, planned: 1 };
    var RUNNING_SET = { running: 1, in_progress: 1, active: 1, doing: 1, executing: 1 };
    var ERROR_SET = { error: 1, failed: 1, failure: 1, blocked: 1 };

    // 四态与 nux-tool-call/nux-subagent-track 同族：pending/running/done/error。
    // 已知完成词归 done；未知状态宽容归一为 pending（清单卡未知≠完成，划线误导；中性待定不吞错）。
    function normalizeStatus(status) {
        var s = String(status || '').toLowerCase();
        if (RUNNING_SET[s]) return 'running';
        if (ERROR_SET[s]) return 'error';
        if (s === 'done' || s === 'completed' || s === 'complete' || s === 'ok' || s === 'success') return 'done';
        return 'pending';
    }

    function entryTitle(item) {
        return item.title || item.content || item.text || item.name || item.id || '未命名任务';
    }

    function entryNote(item) {
        var note = item.note || item.detail || item.activeForm || '';
        return String(note == null ? '' : note);
    }

    var NuxPlanCard = {
        name: 'NuxPlanCard',
        props: {
            items: { type: Array, default: function () { return []; } },
            title: { type: String, default: '任务清单' },
            collapsible: { type: Boolean, default: true },
            interactive: { type: Boolean, default: false }
        },
        emits: ['item-click'],
        data: function () {
            return { doneCollapsed: true };
        },
        computed: {
            views: function () {
                return (this.items || []).map(function (item, i) {
                    var status = normalizeStatus(item.status);
                    return {
                        key: item.id || ('p' + i),
                        title: entryTitle(item),
                        note: entryNote(item),
                        status: status,
                        pending: status === 'pending',
                        running: status === 'running',
                        error: status === 'error',
                        done: status === 'done'
                    };
                });
            },
            doneViews: function () {
                return this.views.filter(function (v) { return v.done; });
            },
            activeViews: function () {
                return this.views.filter(function (v) { return !v.done; });
            },
            doneCount: function () { return this.doneViews.length; },
            totalCount: function () { return this.views.length; },
            progressPct: function () {
                if (!this.totalCount) return 0;
                return Math.round((this.doneCount / this.totalCount) * 100);
            },
            runningView: function () {
                var run = this.views.filter(function (v) { return v.running; });
                return run.length ? run[run.length - 1] : null;
            },
            showDoneBlock: function () {
                return this.collapsible && this.doneCount > 0 && this.doneCollapsed;
            }
        },
        methods: {
            toggleDone: function () {
                this.doneCollapsed = !this.doneCollapsed;
            },
            clickItem: function (view) {
                if (!this.interactive) return;
                this.$emit('item-click', { id: view.key, title: view.title, status: view.status });
            }
        },
        template: `
            <section class="nx-plan-card" :data-nux-plan="totalCount" :data-progress="progressPct" aria-label="任务清单">
                <header class="nx-plan-card-head">
                    <span class="nx-plan-card-title">{{ title }}</span>
                    <span class="nx-plan-card-count">{{ doneCount }}/{{ totalCount }}</span>
                    <span class="nx-plan-card-bar" aria-hidden="true"><i :style="{ width: progressPct + '%' }"></i></span>
                </header>
                <p v-if="runningView" class="nx-plan-card-current" role="status">
                    <span class="nx-plan-card-spinner" aria-hidden="true"></span>{{ runningView.note || runningView.title }}
                </p>
                <ol class="nx-plan-card-list">
                    <li v-for="v in activeViews" :key="v.key" class="nx-plan-card-item" :class="'is-' + v.status"
                        :data-status="v.status" :aria-current="v.running ? 'step' : undefined"
                        :role="interactive ? 'button' : undefined" :tabindex="interactive ? 0 : undefined"
                        @click="clickItem(v)" @keydown.enter="clickItem(v)">
                        <span v-if="v.running" class="nx-plan-card-spinner" aria-hidden="true"></span>
                        <span v-else-if="v.error" class="nx-plan-card-mark is-error" aria-hidden="true">✕</span>
                        <span v-else class="nx-plan-card-mark is-pending" aria-hidden="true"></span>
                        <span class="nx-plan-card-text" :class="{ 'is-error': v.error }">{{ v.title }}</span>
                        <span v-if="v.note && v.status !== 'running'" class="nx-plan-card-note">{{ v.note }}</span>
                    </li>
                    <li v-if="showDoneBlock" class="nx-plan-card-done-toggle">
                        <button type="button" class="nx-plan-card-done-btn" :aria-expanded="'false'" @click="toggleDone">
                            已完成 {{ doneCount }} 项
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                    </li>
                    <template v-if="!showDoneBlock">
                        <li v-for="v in doneViews" :key="v.key" class="nx-plan-card-item is-done" :data-status="'done'">
                            <span class="nx-plan-card-mark is-done" aria-hidden="true">✓</span>
                            <span class="nx-plan-card-text is-done">{{ v.title }}</span>
                        </li>
                    </template>
                </ol>
            </section>
        `
    };

    // 消息内 widget 型注册（type=plan）：复用 CUSTOM 约定键，不新增 AG-UI 词表。
    // item-click → 白名单动词 open（中性），approve 语义由业务侧在 action payload 自理。
    var registry = window.NuxAiWidgetsRegistry || (window.NuxAiWidgetsRegistry = {});
    registry.types = registry.types || {};
    registry.icons = registry.icons || {};
    if (!registry.register) {
        registry.register = function (type, def, icon) {
            registry.types[type] = def;
            if (icon) registry.icons[type] = icon;
        };
    }
    registry.register('plan', {
        name: 'NuxPlanWidget',
        components: { 'nux-plan-card': NuxPlanCard },
        props: { data: { type: Object, default: function () { return {}; } } },
        emits: ['open'],
        methods: {
            onItemClick: function (d) { this.$emit('open', d); }
        },
        template: `<nux-plan-card :items="data.items || []" :title="data.title || '任务清单'"
            :collapsible="data.collapsible !== false" :interactive="data.interactive === true"
            @item-click="onItemClick"></nux-plan-card>`
    }, '📋');

    window.NuxPlanCard = NuxPlanCard;
})();
