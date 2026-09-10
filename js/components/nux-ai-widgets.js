(function () {
    'use strict';

    const STYLE_ID = 'nux-ai-widgets-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.nxw-item{margin-top:10px;background:var(--nx-surf,#fff);border:1px solid var(--nx-border,#e2e6ea);border-radius:10px;overflow:hidden}',
            '.nxw-head{display:flex;align-items:center;gap:6px;padding:8px 12px;font-size:11px;font-weight:600;color:#8a93a2;background:#f7f8fa;border-bottom:1px solid #eef0f3}',
            '.nxw-body{padding:10px 12px}',
            '.nxw-table-wrap{overflow-x:auto;max-height:260px;overflow-y:auto}',
            '.nxw-table{width:100%;border-collapse:collapse;font-size:12px}',
            '.nxw-table th,.nxw-table td{padding:6px 10px;border-bottom:1px solid #eef0f3;text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}',
            '.nxw-table th{color:#8a93a2;font-weight:600;background:#fafbfc;position:sticky;top:0}',
            '.nxw-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
            '.nxw-summary-item{font-size:11px;padding:2px 8px;background:#eef1ff;color:#3b55c4;border-radius:6px}',
            '.nxw-cards{display:flex;flex-direction:column;gap:6px}',
            '.nxw-card-row{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px dashed #eef0f3}',
            '.nxw-card-row:last-child{border-bottom:none}',
            '.nxw-card-icon{flex:0 0 30px;width:30px;height:30px;border-radius:8px;background:#eef1ff;display:flex;align-items:center;justify-content:center;font-size:15px}',
            '.nxw-card-main{flex:1;min-width:0}',
            '.nxw-card-title{font-size:13px;font-weight:600;color:#26303f;display:flex;align-items:center;gap:6px}',
            '.nxw-card-desc{font-size:12px;color:#5b6472;margin-top:2px;line-height:1.5;word-break:break-word}',
            '.nxw-card-meta{font-size:11px;color:#8a93a2;margin-top:3px}',
            '.nxw-steps{display:flex;flex-direction:column}',
            '.nxw-step{display:flex;gap:10px;padding:0 0 12px;position:relative}',
            '.nxw-step:last-child{padding-bottom:0}',
            '.nxw-step-rail{display:flex;flex-direction:column;align-items:center;flex:0 0 16px}',
            '.nxw-step-dot{width:10px;height:10px;border-radius:50%;background:#d5d9df;margin-top:3px;border:2px solid #fff;box-shadow:0 0 0 1px #d5d9df}',
            '.nxw-step.is-done .nxw-step-dot{background:#4b66d9;box-shadow:0 0 0 1px #4b66d9}',
            '.nxw-step.is-active .nxw-step-dot{background:#fff;border-color:#4b66d9;box-shadow:0 0 0 1px #4b66d9}',
            '.nxw-step-line{width:2px;flex:1;background:#eef0f3;margin-top:2px}',
            '.nxw-step-body{flex:1;min-width:0}',
            '.nxw-step-title{font-size:13px;font-weight:600;color:#26303f}',
            '.nxw-step-desc{font-size:12px;color:#8a93a2;margin-top:1px;line-height:1.5}',
            '.nxw-related{display:flex;flex-wrap:wrap;gap:6px}',
            '.nxw-chip{border:1px solid #e2e6ea;background:#fff;color:#3b55c4;border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:border-color .15s,background .15s}',
            '.nxw-chip:hover{border-color:#4b66d9;background:#f5f7ff}',
            '.nxw-choice-msg{font-size:12px;color:#5b6472;margin-bottom:8px}',
            '.nxw-opts{display:flex;flex-wrap:wrap;gap:6px}',
            '.nxw-choice-btn{border:1px solid #e2e6ea;background:#fff;color:#26303f;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;transition:all .15s}',
            '.nxw-choice-btn:hover{border-color:#4b66d9;color:#4b66d9}',
            '.nxw-choice-btn.is-selected{border-color:#4b66d9;background:#eef1ff;color:#3b55c4;font-weight:600}',
            '.nxw-reco{font-size:10px;line-height:1;color:#3b55c4;background:#e3e9ff;border-radius:999px;padding:1px 5px;margin-left:4px}',
            '.nxw-confirm{margin-top:8px;display:flex;gap:8px;align-items:center}',
            '.nxw-primary{background:#4b66d9;color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer}',
            '.nxw-primary:disabled{opacity:.5;cursor:default}',
            '.nxw-feedback{display:flex;align-items:center;gap:8px;padding:2px 0}',
            '.nxw-feedback-tip{font-size:12px;color:#8a93a2;flex:1}',
            '.nxw-fb-btn{width:28px;height:28px;border-radius:8px;border:1px solid #e2e6ea;background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}',
            '.nxw-fb-btn:hover{border-color:#4b66d9;background:#f5f7ff}',
            '.nxw-fb-btn.is-active{border-color:#4b66d9;background:#eef1ff}'
        ].join('\n');
        document.head.appendChild(style);
    }
    ensureStyle();

    const { reactive, computed } = Vue;

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
        template: `
            <div v-if="data" class="nxw-body nxw-steps">
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
            const state = reactive({ selected: [] });
            const isMultiple = computed(() => !!props.data && props.data.multiple);
            const canSubmit = computed(() => {
                if (!props.data || !props.data.options || !props.data.options.length) return false;
                if (!isMultiple.value) return state.selected.length === 1;
                return state.selected.length > 0;
            });
            function toggle(opt) {
                const val = opt.value !== undefined ? opt.value : opt.label;
                const idx = state.selected.indexOf(val);
                if (isMultiple.value) {
                    const max = props.data.max_select || 0;
                    if (idx >= 0) state.selected.splice(idx, 1);
                    else if (!max || state.selected.length < max) state.selected.push(val);
                } else {
                    ctx.emit('submit', val);
                }
            }
            function confirm() {
                if (!canSubmit.value) return;
                ctx.emit('submit', isMultiple.value ? state.selected.slice() : state.selected[0]);
            }
            return { state, isMultiple, canSubmit, toggle, confirm };
        },
        template: `
            <div v-if="data" class="nxw-body">
                <div v-if="data.message" class="nxw-choice-msg">{{ data.message }}</div>
                <div class="nxw-opts">
                    <button v-for="(opt, i) in data.options" :key="i" type="button"
                        class="nxw-choice-btn" :class="{ 'is-selected': state.selected.indexOf(opt.value !== undefined ? opt.value : opt.label) >= 0 }"
                        @click="toggle(opt)">
                        {{ opt.label }}
                        <span v-if="opt.recommended" class="nxw-reco">推荐</span>
                    </button>
                </div>
                <div v-if="isMultiple" class="nxw-confirm">
                    <button type="button" class="nxw-primary" :disabled="!canSubmit" @click="confirm">确认</button>
                </div>
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

    const TYPE_ICONS = {
        table: '📊', cards: '🗂', steps: '🪜', related: '💡', choice: '❓', feedback: '⭐'
    };

    const NuxAiWidgets = {
        name: 'NuxAiWidgets',
        props: { widgets: { type: Array, default: () => [] } },
        emits: ['action'],
        components: {
            WidgetTable, WidgetCards, WidgetSteps, WidgetRelated, WidgetChoice, WidgetFeedback
        },
        setup(props, ctx) {
            const comMap = {
                table: 'WidgetTable', cards: 'WidgetCards', steps: 'WidgetSteps',
                related: 'WidgetRelated', choice: 'WidgetChoice', feedback: 'WidgetFeedback'
            };
            function comOf(type) { return comMap[type] || ''; }
            function iconOf(type) { return TYPE_ICONS[type] || '🧩'; }
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
