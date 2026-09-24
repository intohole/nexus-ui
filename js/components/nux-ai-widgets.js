(function () {
    'use strict';

    const STYLE_ID = 'nux-ai-widgets-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.nxw-item{margin-top:10px;background:var(--nx-bg-surface,#fff);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-md,10px);overflow:hidden}',
            '.nxw-head{display:flex;align-items:center;gap:6px;padding:8px 12px;font-size:11px;font-weight:600;color:var(--nx-text-muted,#94a3b8);background:var(--nx-bg-muted,#f1f5f9);border-bottom:1px solid var(--nx-border,rgba(0,0,0,.08))}',
            '.nxw-body{padding:10px 12px}',
            '.nxw-table-wrap{overflow-x:auto;max-height:260px;overflow-y:auto}',
            '.nxw-table{width:100%;border-collapse:collapse;font-size:12px}',
            '.nxw-table th,.nxw-table td{padding:6px 10px;border-bottom:1px solid var(--nx-border,rgba(0,0,0,.08));text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}',
            '.nxw-table th{color:var(--nx-text-muted,#94a3b8);font-weight:600;background:var(--nx-bg-muted,#f1f5f9);position:sticky;top:0}',
            '.nxw-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
            '.nxw-summary-item{font-size:11px;padding:2px 8px;background:rgba(var(--app-accent-rgb,99,102,241),.08);color:var(--app-accent,#6366f1);border-radius:var(--nx-radius-sm,6px)}',
            '.nxw-cards{display:flex;flex-direction:column;gap:6px}',
            '.nxw-card-row{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dashed var(--nx-border,rgba(0,0,0,.08))}',
            '.nxw-card-row:last-child{border-bottom:none}',
            '.nxw-card-icon{flex:0 0 30px;width:30px;height:30px;border-radius:var(--nx-radius-sm,8px);background:rgba(var(--app-accent-rgb,99,102,241),.08);display:flex;align-items:center;justify-content:center;font-size:15px}',
            '.nxw-card-main{flex:1;min-width:0}',
            '.nxw-card-title{font-size:13px;font-weight:600;color:var(--nx-text-heading,#0f172a);display:flex;align-items:center;gap:6px}',
            '.nxw-card-desc{font-size:12px;color:var(--nx-text-body,#334155);margin-top:2px;line-height:1.5;word-break:break-word}',
            '.nxw-card-meta{font-size:11px;color:var(--nx-text-muted,#94a3b8);margin-top:3px}',
            '.nxw-steps{display:flex;flex-direction:column}',
            '.nxw-step{display:flex;gap:10px;padding:0 0 12px;position:relative}',
            '.nxw-step:last-child{padding-bottom:0}',
            '.nxw-step-rail{display:flex;flex-direction:column;align-items:center;flex:0 0 16px}',
            '.nxw-step-dot{width:10px;height:10px;border-radius:50%;background:var(--nx-border-hover,rgba(0,0,0,.15));margin-top:3px;border:2px solid var(--nx-bg-surface,#fff);box-shadow:0 0 0 1px var(--nx-border-hover,rgba(0,0,0,.15))}',
            '.nxw-step.is-done .nxw-step-dot{background:var(--app-accent,#6366f1);box-shadow:0 0 0 1px var(--app-accent,#6366f1)}',
            '.nxw-step.is-active .nxw-step-dot{background:var(--nx-bg-surface,#fff);border-color:var(--app-accent,#6366f1);box-shadow:0 0 0 1px var(--app-accent,#6366f1)}',
            '.nxw-step.is-failed .nxw-step-dot{background:var(--nx-danger,#ef4444);box-shadow:0 0 0 1px var(--nx-danger,#ef4444)}',
            '.nxw-step.is-failed .nxw-step-title{color:var(--nx-danger,#ef4444)}',
            '.nxw-task-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
            '.nxw-task-status{font-size:11px;font-weight:600;padding:1px 8px;border-radius:var(--nx-radius-full,999px);background:rgba(var(--app-accent-rgb,99,102,241),.1);color:var(--app-accent,#6366f1)}',
            '.nxw-task-status.is-done{background:rgba(var(--nx-success-rgb,16,185,129),.12);color:var(--nx-success,#10b981)}',
            '.nxw-task-status.is-failed{background:rgba(var(--nx-danger-rgb,239,68,68),.1);color:var(--nx-danger,#ef4444)}',
            '.nxw-task-pct{margin-left:auto;font-size:11px;color:var(--nx-text-muted,#94a3b8);font-variant-numeric:tabular-nums}',
            '.nxw-task-bar{height:4px;border-radius:var(--nx-radius-full,999px);background:var(--nx-bg-muted,#f1f5f9);overflow:hidden;margin-bottom:10px}',
            '.nxw-task-bar span{display:block;height:100%;border-radius:inherit;background:var(--app-accent,#6366f1);transition:width .3s ease}',
            '.nxw-task-bar.is-failed span{background:var(--nx-danger,#ef4444)}',
            '.nxw-step-line{width:2px;flex:1;background:var(--nx-border,rgba(0,0,0,.08));margin-top:2px}',
            '.nxw-step-body{flex:1;min-width:0}',
            '.nxw-step-title{font-size:13px;font-weight:600;color:var(--nx-text-heading,#0f172a)}',
            '.nxw-step-desc{font-size:12px;color:var(--nx-text-muted,#94a3b8);margin-top:1px;line-height:1.5}',
            '.nxw-related{display:flex;flex-wrap:wrap;gap:6px}',
            '.nxw-chip{border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);color:var(--app-accent,#6366f1);border-radius:var(--nx-radius-full,999px);padding:5px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:border-color .15s,background .15s}',
            '.nxw-chip:hover{border-color:var(--app-accent,#6366f1);background:var(--nx-bg-hover,#f1f5f9)}',
            '.nxw-choice-msg{font-size:12px;color:var(--nx-text-body,#334155);margin-bottom:8px}',
            '.nxw-opts{display:flex;flex-wrap:wrap;gap:6px}',
            '.nxw-opt{display:flex;flex-direction:column;gap:2px}',
            '.nxw-choice-btn{border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);color:var(--nx-text-heading,#0f172a);border-radius:var(--nx-radius-sm,8px);padding:6px 12px;font-size:12px;cursor:pointer;transition:all .15s;text-align:left}',
            '.nxw-choice-btn:hover{border-color:var(--app-accent,#6366f1);color:var(--app-accent,#6366f1)}',
            '.nxw-choice-btn:disabled{opacity:.5;cursor:default;pointer-events:none}',
            '.nxw-choice-btn.is-selected{border-color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08);color:var(--app-accent,#6366f1);font-weight:600}',
            '.nxw-choice-desc{font-size:11px;color:var(--nx-text-muted,#94a3b8);padding:0 12px 4px}',
            '.nxw-other{margin-top:8px;display:flex;gap:6px;align-items:center}',
            '.nxw-other-input{border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);padding:5px 10px;font-size:12px;color:var(--nx-text-heading,#0f172a);background:var(--nx-bg-surface,#fff);flex:1;min-width:0}',
            '.nxw-other-input:disabled{opacity:.5}',
            '.nxw-choice-expired{margin-top:8px;font-size:11px;color:var(--nx-danger,#ef4444);background:rgba(var(--nx-danger-rgb,239,68,68),.08);border-radius:var(--nx-radius-sm,8px);padding:5px 10px}',
            '.nxw-choice-done{margin-top:8px;font-size:11px;color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08);border-radius:var(--nx-radius-sm,8px);padding:5px 10px}',
            '.nxw-reco{font-size:10px;line-height:1;color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.12);border-radius:var(--nx-radius-full,999px);padding:1px 5px;margin-left:4px}',
            '.nxw-confirm{margin-top:8px;display:flex;gap:8px;align-items:center}',
            '.nxw-primary{background:var(--app-accent,#6366f1);color:var(--nx-text-on-accent,#fff);border:none;border-radius:var(--nx-radius-sm,8px);padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer}',
            '.nxw-primary:disabled{opacity:.5;cursor:default}',
            '.nxw-feedback{display:flex;align-items:center;gap:8px;padding:2px 0}',
            '.nxw-feedback-tip{font-size:12px;color:var(--nx-text-muted,#94a3b8);flex:1}',
            '.nxw-fb-btn{width:44px;height:44px;border-radius:var(--nx-radius-sm,8px);border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}',
            '.nxw-fb-btn:hover{border-color:var(--app-accent,#6366f1);background:var(--nx-bg-hover,#f1f5f9)}',
            '.nxw-fb-btn.is-active{border-color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08)}',
            '@media(hover:none) and (pointer:coarse){.nxw-chip{min-height:44px}.nxw-choice-btn{min-height:44px}}'
        ].join('\n');
        document.head.appendChild(style);
    }
    ensureStyle();

    const { reactive, computed } = Vue;

    const registry = window.NuxAiWidgetsRegistry || (window.NuxAiWidgetsRegistry = {});
    registry.types = registry.types || {};
    registry.icons = registry.icons || {};
    registry.register = function (type, def, icon) {
        if (!type || !def) return;
        registry.types[type] = def;
        if (icon) registry.icons[type] = icon;
    };
    const register = registry.register;

    const WidgetTable = {
        name: 'WidgetTable',
        props: { data: { type: Object, default: null } },
        setup(props) {
            const normRows = computed(() => {
                const data = props.data;
                if (!data || !Array.isArray(data.rows)) return [];
                const cols = data.columns || [];
                return data.rows.map((r) => {
                    if (Array.isArray(r)) {
                        const obj = {};
                        cols.forEach((c, i) => { obj[c] = r[i] !== undefined ? r[i] : ''; });
                        return obj;
                    }
                    return r;
                });
            });
            return { normRows };
        },
        template: `
            <div v-if="data" class="nxw-body">
                <div v-if="data.summary" class="nxw-summary">
                    <span v-for="(v, k) in data.summary" :key="k" class="nxw-summary-item">{{ k }}: {{ v }}</span>
                </div>
                <div class="nxw-table-wrap">
                    <table class="nxw-table">
                        <thead><tr><th v-for="c in data.columns" :key="c">{{ c }}</th></tr></thead>
                        <tbody>
                            <tr v-for="(r, ri) in normRows" :key="ri">
                                <td v-for="c in data.columns" :key="c">{{ r[c] }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `
    };

    const WidgetCards = {
        name: 'WidgetCards',
        props: { data: { type: Object, default: null } },
        emits: ['open'],
        template: `
            <div v-if="data" class="nxw-body nxw-cards">
                <div v-for="(item, i) in data.items" :key="i" class="nxw-card-row"
                    :class="{ 'is-clickable': !!item.url || item.action }"
                    :style="(item.url || item.action) ? 'cursor:pointer' : null"
                    @click="$emit('open', item)">
                    <div class="nxw-card-icon">{{ item.icon || '📄' }}</div>
                    <div class="nxw-card-main">
                        <div class="nxw-card-title">{{ item.title || '' }}</div>
                        <div v-if="item.desc" class="nxw-card-desc">{{ item.desc }}</div>
                        <div v-if="item.meta" class="nxw-card-meta">{{ item.meta }}</div>
                        <div v-if="item.url" class="nxw-card-meta">
                            <a :href="item.url" target="_blank" rel="noopener" @click.stop>查看详情 →</a>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    const WidgetSteps = {
        name: 'WidgetSteps',
        props: { data: { type: Object, default: null } },
        setup(props) {
            const hasPercent = computed(() => !!props.data && typeof props.data.percent === 'number');
            const pct = computed(() => {
                if (!hasPercent.value) return 0;
                return Math.min(Math.max(Math.round(props.data.percent), 0), 100);
            });
            const status = computed(() => (props.data && props.data.status) || '');
            const statusText = computed(() => {
                const map = { running: '执行中', done: '已完成', failed: '执行失败', pending: '待开始' };
                return map[status.value] || '执行中';
            });
            return { hasPercent, pct, status, statusText };
        },
        template: `
            <div v-if="data" class="nxw-body nxw-steps">
                <div v-if="hasPercent || status" class="nxw-task-head">
                    <span class="nxw-task-status" :class="status ? 'is-' + status : ''">{{ statusText }}</span>
                    <span v-if="hasPercent" class="nxw-task-pct">{{ pct }}%</span>
                </div>
                <div v-if="hasPercent" class="nxw-task-bar" :class="{ 'is-failed': status === 'failed' }">
                    <span :style="{ width: pct + '%' }"></span>
                </div>
                <div v-for="(s, i) in data.steps" :key="i" class="nxw-step" :class="'is-' + (s.status || (i === 0 ? 'active' : 'pending'))">
                    <div class="nxw-step-rail">
                        <span class="nxw-step-dot"></span>
                        <span v-if="i < data.steps.length - 1" class="nxw-step-line"></span>
                    </div>
                    <div class="nxw-step-body">
                        <div class="nxw-step-title">{{ s.title }}</div>
                        <div v-if="s.desc" class="nxw-step-desc">{{ s.desc }}</div>
                    </div>
                </div>
            </div>
        `
    };

    const WidgetRelated = {
        name: 'WidgetRelated',
        props: { data: { type: Object, default: null } },
        emits: ['pick'],
        template: `
            <div v-if="data" class="nxw-body nxw-related">
                <button v-for="(item, i) in data.items" :key="i" type="button" class="nxw-chip" @click="$emit('pick', item)">
                    {{ item.icon ? item.icon + ' ' : '' }}{{ item.text || item.value || item }}
                </button>
            </div>
        `
    };

    const WidgetChoice = {
        name: 'WidgetChoice',
        props: { data: { type: Object, default: null } },
        emits: ['submit'],
        setup(props, ctx) {
            const state = reactive({ selected: [], other: '', done: false });
            const isMultiple = computed(() => !!props.data && props.data.multiple);
            const isDisabled = computed(() => !!props.data && (!!props.data.disabled || state.done));
            const canSubmit = computed(() => {
                if (!props.data || !props.data.options || !props.data.options.length) return false;
                if (!isMultiple.value) return state.selected.length === 1;
                return state.selected.length > 0;
            });
            function toggle(opt) {
                if (isDisabled.value) return;
                const val = opt.value !== undefined ? opt.value : opt.label;
                const idx = state.selected.indexOf(val);
                if (isMultiple.value) {
                    const max = props.data.max_select || 0;
                    if (idx >= 0) state.selected.splice(idx, 1);
                    else if (!max || state.selected.length < max) state.selected.push(val);
                } else {
                    state.done = true;
                    ctx.emit('submit', val);
                }
            }
            function confirm() {
                if (!canSubmit.value || isDisabled.value) return;
                state.done = true;
                ctx.emit('submit', isMultiple.value ? state.selected.slice() : state.selected[0]);
            }
            function submitOther() {
                const text = state.other.trim();
                if (!text || isDisabled.value) return;
                state.done = true;
                ctx.emit('submit', text);
            }
            return { state, isMultiple, isDisabled, canSubmit, toggle, confirm, submitOther };
        },
        template: `
            <div v-if="data" class="nxw-body">
                <div v-if="data.message" class="nxw-choice-msg">{{ data.message }}</div>
                <div class="nxw-opts">
                    <div v-for="(opt, i) in data.options" :key="i" class="nxw-opt">
                        <button type="button"
                            class="nxw-choice-btn" :class="{ 'is-selected': state.selected.indexOf(opt.value !== undefined ? opt.value : opt.label) >= 0 }"
                            :disabled="isDisabled" @click="toggle(opt)">
                            {{ opt.label }}
                            <span v-if="opt.recommended" class="nxw-reco">推荐</span>
                        </button>
                        <div v-if="opt.description" class="nxw-choice-desc">{{ opt.description }}</div>
                    </div>
                </div>
                <div v-if="!isMultiple" class="nxw-other">
                    <input v-model="state.other" class="nxw-other-input"
                        :placeholder="data.other_placeholder || '输入其他答案…'" :disabled="isDisabled"
                        @keydown.enter.prevent="submitOther" />
                    <button v-if="state.other.trim()" type="button" class="nxw-primary"
                        :disabled="isDisabled" @click="submitOther">提交</button>
                </div>
                <div v-if="isMultiple" class="nxw-confirm">
                    <button type="button" class="nxw-primary" :disabled="!canSubmit || isDisabled" @click="confirm">确认</button>
                </div>
                <div v-if="data.disabled" class="nxw-choice-expired">该问题已超时失效，请重新提问</div>
                <div v-else-if="state.done" class="nxw-choice-done">已提交，等管家继续回答…</div>
            </div>
        `
    };

    const WidgetFeedback = {
        name: 'WidgetFeedback',
        props: { data: { type: Object, default: null } },
        emits: ['rate'],
        setup(props, ctx) {
            const state = reactive({ value: '' });
            function rate(v) {
                state.value = state.value === v ? '' : v;
                ctx.emit('rate', state.value);
            }
            return { state, rate };
        },
        template: `
            <div v-if="data" class="nxw-body nxw-feedback">
                <span class="nxw-feedback-tip">{{ data.message || '这个回答有帮助吗？' }}</span>
                <button type="button" class="nxw-fb-btn" :class="{ 'is-active': state.value === 'up' }" :aria-pressed="state.value === 'up'" aria-label="有帮助" @click="rate('up')">👍</button>
                <button type="button" class="nxw-fb-btn" :class="{ 'is-active': state.value === 'down' }" :aria-pressed="state.value === 'down'" aria-label="没帮助" @click="rate('down')">👎</button>
            </div>
        `
    };

    register('table', WidgetTable, '📊');
    register('cards', WidgetCards, '🗂');
    register('steps', WidgetSteps, '🪜');
    register('related', WidgetRelated, '💡');
    register('choice', WidgetChoice, '❓');
    register('feedback', WidgetFeedback, '⭐');

    const NuxAiWidgets = {
        name: 'NuxAiWidgets',
        props: { widgets: { type: Array, default: () => [] } },
        emits: ['action'],
        setup(props, ctx) {
            function comOf(type) { return registry.types[type] || null; }
            function iconOf(type) { return registry.icons[type] || '🧩'; }
            function dispatch(w, action, payload) {
                ctx.emit('action', { id: w.id, type: w.type, action: action, payload: payload });
            }
            return { comOf, iconOf, dispatch };
        },
        template: `
            <div class="nxw-list">
                <div v-for="w in widgets" :key="w.id || (w.type + '_' + widgets.indexOf(w))" class="nxw-item">
                    <div class="nxw-head">
                        <span>{{ iconOf(w.type) }}</span>
                        <span>{{ w.title || w.type }}</span>
                    </div>
                    <component :is="comOf(w.type)" v-if="comOf(w.type)" :data="w.data"
                        @pick="(item) => dispatch(w, 'send', item)"
                        @submit="(val) => dispatch(w, 'submit', val)"
                        @confirm="(val) => dispatch(w, 'confirm', val)"
                        @cancel="() => dispatch(w, 'cancel', null)"
                        @rate="(val) => dispatch(w, 'feedback', val)"
                        @open="(item) => dispatch(w, 'open', item)">
                    </component>
                </div>
            </div>
        `
    };

    window.NuxAiWidgets = NuxAiWidgets;
    if (window.Vue && Vue.component) {
        try { Vue.component('nux-ai-widgets', NuxAiWidgets); } catch (e) {}
    }
})();
