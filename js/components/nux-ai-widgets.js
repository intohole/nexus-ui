(function () {
    'use strict';

    const ICONS = {
        table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M9.5 9.5v10"/>',
        cards: '<rect x="4" y="4" width="16" height="7" rx="1.8"/><rect x="4" y="13" width="16" height="7" rx="1.8"/>',
        steps: '<path d="M4 6.5l2 2 3.5-3.5M4 17.5l2 2 3.5-3.5M13 7h7M13 18h7"/>',
        related: '<path d="M9.6 17.5v-1.2c0-.9-1.8-1.9-1.8-4.6a4.2 4.2 0 1 1 8.4 0c0 2.7-1.8 3.7-1.8 4.6v1.2"/><path d="M9.8 20.5h4.4"/>',
        choice: '<circle cx="12" cy="12" r="8.4"/><path d="M9.7 9.4a2.4 2.4 0 1 1 3.3 2.7c-.7.3-1 .8-1 1.6v.4M12 16.9h.01"/>',
        feedback: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z"/>',
        form: '<path d="M12.5 4.5H6a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h11.5a2 2 0 0 0 2-2v-6.5"/><path d="M17.7 3.6a2 2 0 0 1 2.8 2.8L12.5 14.4l-3.7.9.9-3.7z"/>',
        chart: '<path d="M4 4.5v14a1 1 0 0 0 1 1h15"/><path d="M9 15.5v-5M13.5 15.5V7M18 15.5v-3.5"/>',
        confirm: '<path d="M10.3 4.6L2.9 17.4a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.3h.01"/>',
        'thumb-up': '<path d="M7 10.5v9"/><path d="M7 19.5h9.2a1.7 1.7 0 0 0 1.7-1.4l.9-5.4a1.7 1.7 0 0 0-1.7-2H13V5.5a1.7 1.7 0 0 0-3.2-.8L7 10.5"/><path d="M7 10.5H4.9a1.4 1.4 0 0 0-1.4 1.4v6.2a1.4 1.4 0 0 0 1.4 1.4H7"/>',
        'thumb-down': '<path d="M17 13.5v-9"/><path d="M17 4.5H7.8a1.7 1.7 0 0 0-1.7 1.4l-.9 5.4a1.7 1.7 0 0 0 1.7 2H11v5.2a1.7 1.7 0 0 0 3.2.8l2.8-5.8"/><path d="M17 13.5h2.1a1.4 1.4 0 0 0 1.4-1.4V5.9a1.4 1.4 0 0 0-1.4-1.4H17"/>',
        chevron: '<path d="M9.5 6.5l5.5 5.5-5.5 5.5"/>'
    };

    function svgIcon(name) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
    }

    const STYLE_ID = 'nux-ai-widgets-style';
    function ensureStyle() {
        window.NexusUtils && NexusUtils.injectStyle(STYLE_ID, [
            '.nxw-item{margin-top:10px;background:var(--nx-bg-surface,#fff);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-md,10px);box-shadow:var(--nx-shadow-sm,0 1px 3px rgba(0,0,0,.08));overflow:hidden}',
            '.nxw-head{display:flex;align-items:center;gap:7px;padding:10px 12px 0;font-size:12px;font-weight:600;color:var(--nx-text-heading,#0f172a);letter-spacing:.01em}',
            '.nxw-head-emoji{font-size:13px;line-height:1}',
            '.nxw-ico{display:inline-flex;flex:0 0 auto;width:15px;height:15px;color:var(--app-accent,#6366f1)}',
            '.nxw-ico svg{display:block;width:100%;height:100%}',
            '.nxw-body{padding:8px 12px 12px}',
            '.nxw-table-wrap{overflow-x:auto;max-height:264px;overflow-y:auto}',
            '.nxw-table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}',
            '.nxw-table th,.nxw-table td{padding:7px 10px;text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}',
            '.nxw-table th{position:sticky;top:0;z-index:1;font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--nx-text-muted,#94a3b8);background:var(--nx-bg-muted,#f1f5f9);border-bottom:1px solid var(--nx-border-hover,rgba(0,0,0,.15))}',
            '.nxw-table td{color:var(--nx-text-body,#334155);border-bottom:1px solid var(--nx-border,rgba(0,0,0,.08))}',
            '.nxw-table tbody tr:last-child td{border-bottom:none}',
            '.nxw-table tbody tr:hover td{background:var(--nx-bg-hover,#f1f5f9)}',
            '.nxw-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}',
            '.nxw-summary-item{font-size:11px;font-weight:600;padding:2px 9px;background:rgba(var(--app-accent-rgb,99,102,241),.08);color:var(--app-accent,#6366f1);border-radius:var(--nx-radius-full,999px);font-variant-numeric:tabular-nums}',
            '.nxw-cards{display:flex;flex-direction:column;gap:2px}',
            '.nxw-card-row{display:flex;align-items:flex-start;gap:10px;padding:8px;border-radius:var(--nx-radius-sm,6px)}',
            '.nxw-card-row.is-clickable{cursor:pointer;transition:background var(--nx-transition-fast,150ms)}',
            '.nxw-card-row.is-clickable:hover{background:var(--nx-bg-hover,#f1f5f9)}',
            '.nxw-card-icon{flex:0 0 30px;width:30px;height:30px;border-radius:var(--nx-radius-sm,6px);background:rgba(var(--app-accent-rgb,99,102,241),.08);display:flex;align-items:center;justify-content:center;font-size:15px}',
            '.nxw-card-main{flex:1;min-width:0}',
            '.nxw-card-title{font-size:13px;font-weight:600;color:var(--nx-text-heading,#0f172a);line-height:1.4}',
            '.nxw-card-desc{font-size:12px;color:var(--nx-text-body,#334155);margin-top:2px;line-height:1.55;word-break:break-word}',
            '.nxw-card-meta{font-size:11px;color:var(--nx-text-muted,#94a3b8);margin-top:3px;font-variant-numeric:tabular-nums}',
            '.nxw-card-link{display:inline-flex;align-items:center;gap:2px;margin-top:4px;font-size:12px;font-weight:500;color:var(--app-accent,#6366f1)}',
            '.nxw-card-link .nxw-ico{width:12px;height:12px;margin-top:1px}',
            '.nxw-card-link:hover{color:var(--app-accent-hover,#818cf8)}',
            '.nxw-steps{display:flex;flex-direction:column}',
            '.nxw-step{display:flex;gap:10px;padding:0 0 14px;position:relative}',
            '.nxw-step:last-child{padding-bottom:0}',
            '.nxw-step-rail{display:flex;flex-direction:column;align-items:center;flex:0 0 18px}',
            '.nxw-step-dot{width:12px;height:12px;margin-top:2px;border-radius:50%;background:var(--nx-bg-muted,#f1f5f9);box-shadow:inset 0 0 0 1.5px var(--nx-border-hover,rgba(0,0,0,.15))}',
            '.nxw-step.is-done .nxw-step-dot{background:var(--app-accent,#6366f1);box-shadow:none}',
            '.nxw-step.is-active .nxw-step-dot{background:var(--nx-bg-surface,#fff);box-shadow:inset 0 0 0 1.5px var(--app-accent,#6366f1),0 0 0 3px rgba(var(--app-accent-rgb,99,102,241),.15)}',
            '.nxw-step.is-failed .nxw-step-dot{background:var(--nx-danger,#ef4444);box-shadow:none}',
            '.nxw-step.is-failed .nxw-step-title{color:var(--nx-danger,#ef4444)}',
            '.nxw-step-line{width:2px;flex:1;margin-top:3px;border-radius:1px;background:var(--nx-border,rgba(0,0,0,.08))}',
            '.nxw-step.is-done .nxw-step-line{background:rgba(var(--app-accent-rgb,99,102,241),.35)}',
            '.nxw-step-body{flex:1;min-width:0}',
            '.nxw-step-title{font-size:13px;font-weight:600;color:var(--nx-text-heading,#0f172a);line-height:1.5}',
            '.nxw-step-desc{font-size:12px;color:var(--nx-text-muted,#94a3b8);margin-top:1px;line-height:1.55}',
            '.nxw-task-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
            '.nxw-task-status{font-size:11px;font-weight:600;padding:2px 9px;border-radius:var(--nx-radius-full,999px);background:rgba(var(--app-accent-rgb,99,102,241),.1);color:var(--app-accent,#6366f1)}',
            '.nxw-task-status.is-done{background:rgba(var(--nx-success-rgb,16,185,129),.12);color:var(--nx-success,#10b981)}',
            '.nxw-task-status.is-failed{background:rgba(var(--nx-danger-rgb,239,68,68),.1);color:var(--nx-danger,#ef4444)}',
            '.nxw-task-pct{margin-left:auto;font-size:11px;font-weight:600;color:var(--nx-text-heading,#0f172a);font-variant-numeric:tabular-nums}',
            '.nxw-task-bar{height:5px;border-radius:var(--nx-radius-full,999px);background:var(--nx-bg-muted,#f1f5f9);overflow:hidden;margin-bottom:12px}',
            '.nxw-task-bar span{display:block;height:100%;border-radius:inherit;background:var(--app-accent,#6366f1);transition:width .3s var(--nx-ease-out,ease)}',
            '.nxw-task-bar.is-failed span{background:var(--nx-danger,#ef4444)}',
            '.nxw-related{display:flex;flex-wrap:wrap;gap:7px}',
            '.nxw-chip{border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);color:var(--nx-text-body,#334155);border-radius:var(--nx-radius-full,999px);padding:5px 13px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:border-color var(--nx-transition-fast,150ms),background var(--nx-transition-fast,150ms),color var(--nx-transition-fast,150ms)}',
            '.nxw-chip:hover{border-color:var(--nx-border-accent,rgba(var(--app-accent-rgb,99,102,241),.3));background:rgba(var(--app-accent-rgb,99,102,241),.06);color:var(--app-accent,#6366f1)}',
            '.nxw-choice-msg{font-size:12px;color:var(--nx-text-body,#334155);margin-bottom:9px;line-height:1.55}',
            '.nxw-opts{display:flex;flex-wrap:wrap;gap:8px}',
            '.nxw-choice-btn{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);border-radius:var(--nx-radius-sm,8px);padding:8px 12px;cursor:pointer;text-align:left;transition:border-color var(--nx-transition-fast,150ms),background var(--nx-transition-fast,150ms),box-shadow var(--nx-transition-fast,150ms)}',
            '.nxw-choice-btn:hover{border-color:var(--nx-border-accent,rgba(var(--app-accent-rgb,99,102,241),.3));background:var(--nx-bg-hover,#f1f5f9)}',
            '.nxw-choice-btn:disabled{opacity:.5;cursor:default;pointer-events:none}',
            '.nxw-choice-btn.is-selected{border-color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.07);box-shadow:inset 0 0 0 1px var(--app-accent,#6366f1)}',
            '.nxw-choice-label{font-size:12.5px;font-weight:600;color:var(--nx-text-heading,#0f172a)}',
            '.nxw-choice-btn.is-selected .nxw-choice-label{color:var(--app-accent,#6366f1)}',
            '.nxw-choice-desc{font-size:11px;font-weight:400;color:var(--nx-text-muted,#94a3b8);line-height:1.5}',
            '.nxw-choice-btn.is-selected .nxw-choice-desc{color:rgba(var(--app-accent-rgb,99,102,241),.75)}',
            '.nxw-reco{font-size:10px;font-weight:600;line-height:1;color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.12);border-radius:var(--nx-radius-full,999px);padding:2px 6px;margin-left:5px}',
            '.nxw-other{margin-top:10px;display:flex;gap:7px;align-items:center}',
            '.nxw-other-input{border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);padding:6px 11px;font-size:12px;color:var(--nx-text-heading,#0f172a);background:var(--nx-bg-surface,#fff);flex:1;min-width:0;transition:border-color var(--nx-transition-fast,150ms),box-shadow var(--nx-transition-fast,150ms)}',
            '.nxw-other-input::placeholder{color:var(--nx-text-muted,#94a3b8)}',
            '.nxw-other-input:disabled{opacity:.5}',
            '.nxw-choice-expired{margin-top:10px;font-size:11px;color:var(--nx-danger,#ef4444);background:rgba(var(--nx-danger-rgb,239,68,68),.08);border-radius:var(--nx-radius-sm,8px);padding:6px 10px;line-height:1.5}',
            '.nxw-choice-done{margin-top:10px;font-size:11px;color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08);border-radius:var(--nx-radius-sm,8px);padding:6px 10px;line-height:1.5}',
            '.nxw-confirm{margin-top:10px;display:flex;gap:8px;align-items:center}',
            '.nxw-primary{background:var(--app-accent,#6366f1);color:var(--nx-text-on-accent,#fff);border:none;border-radius:var(--nx-radius-sm,8px);padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;transition:background var(--nx-transition-fast,150ms),box-shadow var(--nx-transition-fast,150ms)}',
            '.nxw-primary:hover{background:var(--app-accent-hover,#818cf8)}',
            '.nxw-primary:disabled{opacity:.5;cursor:default}',
            '.nxw-primary:disabled:hover{background:var(--app-accent,#6366f1)}',
            '.nxw-feedback{display:flex;align-items:center;gap:8px;padding:2px 0}',
            '.nxw-feedback-tip{font-size:12px;color:var(--nx-text-secondary,#64748b);flex:1}',
            '.nxw-fb-btn{width:36px;height:36px;border-radius:var(--nx-radius-sm,8px);border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);color:var(--nx-text-muted,#94a3b8);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color var(--nx-transition-fast,150ms),color var(--nx-transition-fast,150ms),background var(--nx-transition-fast,150ms)}',
            '.nxw-fb-btn .nxw-ico{width:16px;height:16px;color:inherit}',
            '.nxw-fb-btn:hover{border-color:var(--nx-border-accent,rgba(var(--app-accent-rgb,99,102,241),.3));color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.05)}',
            '.nxw-fb-btn.is-active{border-color:var(--app-accent,#6366f1);color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08)}',
            '.nxw-chip:focus-visible,.nxw-choice-btn:focus-visible,.nxw-primary:focus-visible,.nxw-fb-btn:focus-visible{outline:none;border-color:var(--app-accent,#6366f1);box-shadow:0 0 0 3px rgba(var(--app-accent-rgb,99,102,241),.18)}',
            '.nxw-other-input:focus{outline:none;border-color:var(--app-accent,#6366f1);box-shadow:0 0 0 3px rgba(var(--app-accent-rgb,99,102,241),.14)}',
            '@media(hover:none) and (pointer:coarse){.nxw-chip{min-height:44px}.nxw-choice-btn{min-height:44px}.nxw-primary{min-height:44px}.nxw-fb-btn{width:44px;height:44px}.nxw-other-input{min-height:40px}}',
            '@media(prefers-reduced-motion:reduce){.nxw-list *{transition:none!important}}'
        ]);
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
        setup() { return { chevron: svgIcon('chevron') }; },
        template: `
            <div v-if="data" class="nxw-body nxw-cards">
                <div v-for="(item, i) in (data.items || data.cards || [])" :key="i" class="nxw-card-row"
                    :class="{ 'is-clickable': !!item.url || item.action }"
                    @click="$emit('open', item)">
                    <div class="nxw-card-icon">{{ item.icon || '📄' }}</div>
                    <div class="nxw-card-main">
                        <div class="nxw-card-title">{{ item.title || '' }}</div>
                        <div v-if="item.desc" class="nxw-card-desc">{{ item.desc }}</div>
                        <div v-if="item.meta" class="nxw-card-meta">{{ item.meta }}</div>
                        <a v-if="item.url" class="nxw-card-link" :href="item.url" target="_blank" rel="noopener" @click.stop>
                            查看详情<span class="nxw-ico" v-html="chevron"></span>
                        </a>
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
                    <button v-for="(opt, i) in data.options" :key="i" type="button" class="nxw-choice-btn"
                        :class="{ 'is-selected': state.selected.indexOf(opt.value !== undefined ? opt.value : opt.label) >= 0 }"
                        :disabled="isDisabled" @click="toggle(opt)">
                        <span class="nxw-choice-label">{{ opt.label }}<span v-if="opt.recommended" class="nxw-reco">推荐</span></span>
                        <span v-if="opt.description" class="nxw-choice-desc">{{ opt.description }}</span>
                    </button>
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
            return { state, rate, upIcon: svgIcon('thumb-up'), downIcon: svgIcon('thumb-down') };
        },
        template: `
            <div v-if="data" class="nxw-body nxw-feedback">
                <span class="nxw-feedback-tip">{{ data.message || '这个回答有帮助吗？' }}</span>
                <button type="button" class="nxw-fb-btn" :class="{ 'is-active': state.value === 'up' }" :aria-pressed="state.value === 'up'" aria-label="有帮助" @click="rate('up')"><span class="nxw-ico" v-html="upIcon"></span></button>
                <button type="button" class="nxw-fb-btn" :class="{ 'is-active': state.value === 'down' }" :aria-pressed="state.value === 'down'" aria-label="没帮助" @click="rate('down')"><span class="nxw-ico" v-html="downIcon"></span></button>
            </div>
        `
    };

    register('table', WidgetTable);
    register('cards', WidgetCards);
    register('steps', WidgetSteps);
    register('related', WidgetRelated);
    register('choice', WidgetChoice);
    register('feedback', WidgetFeedback);

    const NuxAiWidgets = {
        name: 'NuxAiWidgets',
        props: { widgets: { type: Array, default: () => [] } },
        emits: ['action'],
        setup(props, ctx) {
            function comOf(type) { return registry.types[type] || null; }
            function hasCustomIcon(type) { return !!registry.icons[type]; }
            function iconText(type) { return registry.icons[type] || ''; }
            function icoSvg(type) { return ICONS[type] ? svgIcon(type) : ''; }
            function dispatch(w, action, payload) {
                ctx.emit('action', { id: w.id, type: w.type, action: action, payload: payload });
            }
            return { comOf, hasCustomIcon, iconText, icoSvg, dispatch };
        },
        template: `
            <div class="nxw-list">
                <div v-for="w in widgets" :key="w.id || (w.type + '_' + widgets.indexOf(w))" class="nxw-item">
                    <div class="nxw-head">
                        <span v-if="hasCustomIcon(w.type)" class="nxw-head-emoji">{{ iconText(w.type) }}</span>
                        <span v-else-if="icoSvg(w.type)" class="nxw-ico" v-html="icoSvg(w.type)"></span>
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
