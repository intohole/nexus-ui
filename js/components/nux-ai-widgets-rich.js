(function () {
    'use strict';

    const STYLE_ID = 'nux-ai-widgets-rich-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.nxw-form{display:flex;flex-direction:column;gap:10px}',
            '.nxw-field{display:flex;flex-direction:column;gap:4px}',
            '.nxw-field-label{font-size:12px;font-weight:600;color:var(--nx-text-heading,#0f172a)}',
            '.nxw-field-label em{color:var(--nx-danger,#ef4444);font-style:normal;margin-left:2px}',
            '.nxw-field-input{border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);background:var(--nx-bg-surface,#fff);padding:7px 10px;font-size:13px;color:var(--nx-text-heading,#0f172a);font-family:inherit;width:100%;box-sizing:border-box}',
            '.nxw-field-input:focus{outline:none;border-color:var(--app-accent,#6366f1)}',
            '.nxw-field-input:disabled{opacity:.5}',
            '.nxw-field-hint{font-size:11px;color:var(--nx-text-muted,#94a3b8)}',
            '.nxw-switch-row{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--nx-text-body,#334155)}',
            '.nxw-switch{width:40px;height:22px;border-radius:var(--nx-radius-full,999px);border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-muted,#f1f5f9);position:relative;cursor:pointer;flex:0 0 40px;padding:0;transition:background .18s,border-color .18s}',
            '.nxw-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--nx-bg-surface,#fff);box-shadow:0 1px 2px rgba(15,23,42,.2);transition:left .18s}',
            '.nxw-switch.is-on{background:var(--app-accent,#6366f1);border-color:var(--app-accent,#6366f1)}',
            '.nxw-switch.is-on::after{left:20px}',
            '.nxw-ghost{background:var(--nx-bg-surface,#fff);color:var(--nx-text-muted,#94a3b8);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);padding:6px 16px;font-size:12px;cursor:pointer;transition:color .15s,border-color .15s}',
            '.nxw-ghost:hover{color:var(--nx-text-heading,#0f172a);border-color:var(--nx-border-hover,rgba(0,0,0,.15))}',
            '.nxw-ghost:disabled{opacity:.5;cursor:default}',
            '.nxw-danger{background:var(--nx-danger,#ef4444);color:var(--nx-text-on-accent,#fff);border:none;border-radius:var(--nx-radius-sm,8px);padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer}',
            '.nxw-danger:disabled{opacity:.5;cursor:default}',
            '.nxw-chart{width:100%}',
            '.nxw-chart-fallback{display:flex;align-items:center;justify-content:center;height:160px;border:1px dashed var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);background:var(--nx-bg-muted,#f1f5f9);color:var(--nx-text-muted,#94a3b8);font-size:12px}',
            '.nxw-cf-message{font-size:13px;font-weight:600;color:var(--nx-text-heading,#0f172a);line-height:1.5}',
            '.nxw-cf-detail{font-size:12px;color:var(--nx-text-body,#334155);margin-top:4px;line-height:1.5}',
            '.nxw-cf-items{list-style:none;margin:8px 0 0;padding:8px 10px;background:var(--nx-bg-muted,#f1f5f9);border-radius:var(--nx-radius-sm,8px);font-size:12px;color:var(--nx-text-body,#334155);display:flex;flex-direction:column;gap:4px;max-height:170px;overflow:auto}',
            '.nxw-cf-warn{margin-top:8px;font-size:11px;color:var(--nx-danger,#ef4444);background:rgba(var(--nx-danger-rgb,239,68,68),.08);border-radius:var(--nx-radius-sm,8px);padding:5px 10px}',
            '@media(hover:none) and (pointer:coarse){.nxw-field-input{min-height:44px}.nxw-primary{min-height:44px}.nxw-ghost{min-height:44px}.nxw-danger{min-height:44px}}'
        ].join('\n');
        document.head.appendChild(style);
    }
    ensureStyle();

    const { ref, reactive, computed, onMounted, onBeforeUnmount, watch } = Vue;

    const registry = window.NuxAiWidgetsRegistry || (window.NuxAiWidgetsRegistry = {});
    registry.types = registry.types || {};
    registry.icons = registry.icons || {};
    if (!registry.register) {
        registry.register = function (type, def, icon) {
            registry.types[type] = def;
            if (icon) registry.icons[type] = icon;
        };
    }

    const ECHARTS_URL = 'https://registry.npmmirror.com/echarts/5.5.0/files/dist/echarts.min.js';
    const PALETTE = ['#6366f1', '#38bdf8', '#14b8a6', '#f59e0b', '#94a3b8', '#818cf8'];
    let echartsPromise = null;

    function loadEcharts() {
        if (window.echarts) return Promise.resolve(window.echarts);
        if (echartsPromise) return echartsPromise;
        echartsPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = ECHARTS_URL;
            script.async = true;
            script.onload = () => {
                if (window.echarts) { resolve(window.echarts); return; }
                echartsPromise = null;
                reject(new Error('图表组件未就绪'));
            };
            script.onerror = () => { echartsPromise = null; reject(new Error('图表加载失败')); };
            document.head.appendChild(script);
        });
        return echartsPromise;
    }

    function normOptions(options) {
        return (options || []).map((o) => (typeof o === 'string'
            ? { label: o, value: o }
            : { label: o.label || o.value, value: o.value !== undefined ? o.value : o.label }));
    }

    function normItems(items) {
        const out = [];
        (items || []).forEach((it) => {
            const text = typeof it === 'string' ? it : (it.label || it.value || it.text || '');
            if (text) out.push(text);
        });
        return out;
    }

    const WidgetForm = {
        name: 'WidgetForm',
        props: { data: { type: Object, default: null } },
        emits: ['submit', 'cancel'],
        setup(props, ctx) {
            const state = reactive({ values: {}, done: false });
            const normFields = computed(() => ((props.data && props.data.fields) || []).map((f) => ({
                key: f.key,
                label: f.label || f.key,
                type: f.type || 'text',
                placeholder: f.placeholder || '',
                hint: f.hint || '',
                required: f.required === true,
                default: f.default,
                options: normOptions(f.options),
                min: f.min,
                max: f.max
            })));
            normFields.value.forEach((f) => {
                if (state.values[f.key] !== undefined) return;
                if (f.type === 'switch') state.values[f.key] = f.default === true;
                else state.values[f.key] = f.default !== undefined && f.default !== null ? f.default : '';
            });
            const isDisabled = computed(() => !!(props.data && props.data.disabled) || state.done);
            const canSubmit = computed(() => {
                if (isDisabled.value) return false;
                return normFields.value.every((f) => {
                    if (!f.required) return true;
                    const v = state.values[f.key];
                    return v !== undefined && v !== null && String(v).trim() !== '';
                });
            });
            function toggle(field) {
                if (isDisabled.value) return;
                state.values[field.key] = !state.values[field.key];
            }
            function submit() {
                if (!canSubmit.value) return;
                state.done = true;
                const out = {};
                normFields.value.forEach((f) => {
                    let v = state.values[f.key];
                    if (f.type === 'number' && v !== '' && v !== null && v !== undefined) v = Number(v);
                    out[f.key] = v;
                });
                ctx.emit('submit', out);
            }
            function cancel() {
                if (isDisabled.value) return;
                state.done = true;
                ctx.emit('cancel');
            }
            return { state, normFields, isDisabled, canSubmit, toggle, submit, cancel };
        },
        template: `
            <div v-if="data" class="nxw-body">
                <div v-if="data.message" class="nxw-choice-msg">{{ data.message }}</div>
                <div class="nxw-form">
                    <label v-for="f in normFields" :key="f.key" class="nxw-field">
                        <span class="nxw-field-label">{{ f.label }}<em v-if="f.required">*</em></span>
                        <template v-if="f.type === 'switch'">
                            <span class="nxw-switch-row">
                                <button type="button" class="nxw-switch" :class="{ 'is-on': state.values[f.key] }"
                                    :disabled="isDisabled" :aria-pressed="!!state.values[f.key]"
                                    @click="toggle(f)"></button>
                                <span>{{ f.placeholder || '开启' }}</span>
                            </span>
                        </template>
                        <select v-else-if="f.type === 'select'" v-model="state.values[f.key]" class="nxw-field-input" :disabled="isDisabled">
                            <option value="">请选择</option>
                            <option v-for="(o, oi) in f.options" :key="oi" :value="o.value">{{ o.label }}</option>
                        </select>
                        <textarea v-else-if="f.type === 'textarea'" v-model="state.values[f.key]" class="nxw-field-input"
                            rows="3" :placeholder="f.placeholder" :disabled="isDisabled"></textarea>
                        <input v-else v-model="state.values[f.key]" class="nxw-field-input"
                            :type="f.type" :min="f.min" :max="f.max" :placeholder="f.placeholder" :disabled="isDisabled" />
                        <span v-if="f.hint" class="nxw-field-hint">{{ f.hint }}</span>
                    </label>
                </div>
                <div class="nxw-confirm">
                    <button type="button" class="nxw-primary" :disabled="!canSubmit" @click="submit">{{ data.submit_text || '提交' }}</button>
                    <button v-if="data.allow_cancel" type="button" class="nxw-ghost" :disabled="isDisabled" @click="cancel">{{ data.cancel_text || '取消' }}</button>
                </div>
                <div v-if="data.disabled" class="nxw-choice-expired">该表单已失效，请重新发起</div>
                <div v-else-if="state.done" class="nxw-choice-done">已提交…</div>
            </div>
        `
    };

    const WidgetChart = {
        name: 'WidgetChart',
        props: { data: { type: Object, default: null } },
        setup(props) {
            const hostRef = ref(null);
            const failed = ref(false);
            let instance = null;
            const height = computed(() => (props.data && props.data.height) || 220);

            function buildOption() {
                const d = props.data || {};
                if (d.option) return d.option;
                const kind = d.chart || 'bar';
                const series = (d.series || []).map((s) => {
                    const base = { name: s.name || '', data: s.data || [] };
                    if (kind === 'pie') {
                        return Object.assign(base, {
                            type: 'pie',
                            radius: d.radius || ['42%', '68%'],
                            itemStyle: { borderColor: 'var(--nx-bg-surface,#fff)', borderWidth: 2 }
                        });
                    }
                    return Object.assign(base, {
                        type: kind,
                        smooth: kind === 'line',
                        barMaxWidth: kind === 'bar' ? 26 : undefined,
                        itemStyle: kind === 'bar' ? { borderRadius: [4, 4, 0, 0] } : undefined,
                        areaStyle: kind === 'line' && d.area ? { opacity: 0.12 } : undefined
                    });
                });
                if (kind === 'pie') {
                    return {
                        color: PALETTE,
                        tooltip: { trigger: 'item' },
                        legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11 } },
                        series: series
                    };
                }
                return {
                    color: PALETTE,
                    grid: { left: 4, right: 12, top: series.length > 1 ? 30 : 12, bottom: 4, containLabel: true },
                    tooltip: { trigger: 'axis' },
                    legend: series.length > 1 ? { top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 11 } } : undefined,
                    xAxis: {
                        type: 'category',
                        data: d.categories || [],
                        axisLine: { lineStyle: { color: '#cbd5e1' } },
                        axisTick: { show: false },
                        axisLabel: { fontSize: 11, color: '#64748b' }
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: { lineStyle: { color: '#f1f5f9' } },
                        axisLabel: { fontSize: 11, color: '#64748b' }
                    },
                    series: series
                };
            }

            function render() {
                if (!hostRef.value) return;
                loadEcharts().then((ec) => {
                    if (!hostRef.value) return;
                    if (!instance) instance = ec.init(hostRef.value);
                    instance.setOption(buildOption(), true);
                    instance.resize();
                    failed.value = false;
                }).catch(() => { failed.value = true; });
            }

            onMounted(render);
            watch(() => props.data, render, { deep: true });
            onBeforeUnmount(() => {
                if (instance) { instance.dispose(); instance = null; }
            });
            return { hostRef, failed, height };
        },
        template: `
            <div v-if="data" class="nxw-body">
                <div ref="hostRef" class="nxw-chart" v-show="!failed" :style="{ height: height + 'px' }"></div>
                <div v-if="failed" class="nxw-chart-fallback">图表加载失败，请检查网络后重试</div>
            </div>
        `
    };

    const WidgetConfirm = {
        name: 'WidgetConfirm',
        props: { data: { type: Object, default: null } },
        emits: ['confirm'],
        setup(props, ctx) {
            const state = reactive({ done: false, result: false });
            const items = computed(() => normItems(props.data && props.data.items));
            const isDisabled = computed(() => !!(props.data && props.data.disabled) || state.done);
            function choose(ok) {
                if (isDisabled.value) return;
                state.done = true;
                state.result = ok;
                ctx.emit('confirm', ok);
            }
            return { state, items, isDisabled, choose };
        },
        template: `
            <div v-if="data" class="nxw-body">
                <div class="nxw-cf-message">{{ data.message || '确认执行该操作？' }}</div>
                <div v-if="data.detail" class="nxw-cf-detail">{{ data.detail }}</div>
                <ul v-if="items.length" class="nxw-cf-items">
                    <li v-for="(it, i) in items" :key="i">{{ it }}</li>
                </ul>
                <div v-if="data.warning" class="nxw-cf-warn">{{ data.warning }}</div>
                <div class="nxw-confirm">
                    <button type="button" class="nxw-danger" :disabled="isDisabled" @click="choose(true)">{{ data.confirm_text || '确认执行' }}</button>
                    <button type="button" class="nxw-ghost" :disabled="isDisabled" @click="choose(false)">{{ data.cancel_text || '取消' }}</button>
                </div>
                <div v-if="data.disabled" class="nxw-choice-expired">该操作已失效，请重新发起</div>
                <div v-else-if="state.done" class="nxw-choice-done">{{ state.result ? '已确认，正在执行…' : '已取消该操作' }}</div>
            </div>
        `
    };

    registry.register('form', WidgetForm, '📝');
    registry.register('chart', WidgetChart, '📈');
    registry.register('confirm', WidgetConfirm, '⚠️');
})();
