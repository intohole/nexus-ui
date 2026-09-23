(function () {
    const STYLE_ID = 'nux-slider-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nsl{display:flex;flex-direction:column;gap:var(--nx-space-2,8px);width:100%}
.nsl-head{display:flex;align-items:center;justify-content:space-between;gap:var(--nx-space-3,12px)}
.nsl-label{font-size:var(--nx-text-sm,14px);font-weight:500;color:var(--nx-text-heading,#0f172a)}
.nsl-value{font-size:var(--nx-text-sm,14px);font-weight:600;color:var(--app-accent,#6366f1);font-variant-numeric:tabular-nums}
.nsl-track{position:relative;display:flex;align-items:center;height:24px}
.nsl-rail{position:absolute;left:0;right:0;top:50%;height:6px;transform:translateY(-50%);border-radius:var(--nx-radius-full,9999px);background:var(--nx-bg-muted,#f1f5f9)}
.nsl-fill{position:absolute;left:0;top:50%;height:6px;transform:translateY(-50%);border-radius:var(--nx-radius-full,9999px);background:var(--app-accent,#6366f1);transition:width var(--nx-transition-fast,.15s ease)}
.nsl-input{position:relative;width:100%;height:24px;margin:0;background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none}
.nsl-input:focus{outline:none}
.nsl-input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px rgba(var(--app-accent-rgb,99,102,241),.25)}
.nsl-input:focus-visible::-moz-range-thumb{box-shadow:0 0 0 4px rgba(var(--app-accent-rgb,99,102,241),.25)}
.nsl-input::-webkit-slider-runnable-track{height:6px;background:transparent;border:none}
.nsl-input::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;margin-top:-6px;border-radius:var(--nx-radius-full,9999px);background:var(--nx-bg-surface,#fff);border:2px solid var(--app-accent,#6366f1);box-shadow:var(--nx-shadow-sm,0 1px 3px rgba(0,0,0,.08));cursor:pointer;transition:box-shadow var(--nx-transition-fast,.15s ease)}
.nsl-input::-moz-range-track{height:6px;background:transparent;border:none}
.nsl-input::-moz-range-thumb{width:18px;height:18px;border-radius:var(--nx-radius-full,9999px);background:var(--nx-bg-surface,#fff);border:2px solid var(--app-accent,#6366f1);box-shadow:var(--nx-shadow-sm,0 1px 3px rgba(0,0,0,.08));cursor:pointer}
.nsl--disabled .nsl-fill{background:var(--nx-text-muted,#94a3b8)}
.nsl--disabled .nsl-input::-webkit-slider-thumb{border-color:var(--nx-border-hover,rgba(0,0,0,.15));cursor:default}
.nsl--disabled .nsl-input::-moz-range-thumb{border-color:var(--nx-border-hover,rgba(0,0,0,.15));cursor:default}
.nsl--disabled .nsl-value{color:var(--nx-text-muted,#94a3b8)}
@media(hover:none) and (pointer:coarse){.nsl-track{height:44px}.nsl-input{height:44px}.nsl-input::-webkit-slider-thumb{width:24px;height:24px;margin-top:-9px}.nsl-input::-moz-range-thumb{width:24px;height:24px}}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    const NuxSlider = {
        name: 'NuxSlider',
        props: {
            modelValue: { type: Number, default: 0 },
            min: { type: Number, default: 0 },
            max: { type: Number, default: 100 },
            step: { type: Number, default: 1 },
            disabled: { type: Boolean, default: false },
            label: { type: String, default: '' },
            showValue: { type: Boolean, default: true },
            unit: { type: String, default: '' }
        },
        emits: ['update:modelValue', 'change'],
        setup(props, ctx) {
            const instance = Vue.getCurrentInstance();
            const uid = 'nsl-' + (instance ? instance.uid : Math.random().toString(36).slice(2));

            const percent = Vue.computed(() => {
                const min = Number(props.min);
                const max = Number(props.max);
                if (!(max > min)) return 0;
                const raw = Number(props.modelValue);
                const value = isNaN(raw) ? min : Math.min(Math.max(raw, min), max);
                return ((value - min) / (max - min)) * 100;
            });

            const display = Vue.computed(() => String(props.modelValue) + (props.unit || ''));

            function onInput(event) {
                const value = Number(event.target.value);
                ctx.emit('update:modelValue', value);
            }

            function onChange(event) {
                ctx.emit('change', Number(event.target.value));
            }

            return { uid, percent, display, onInput, onChange };
        },
        template: `
<div class="nsl" :class="{ 'nsl--disabled': disabled }">
    <div v-if="label || showValue" class="nsl-head">
        <label v-if="label" class="nsl-label" :for="uid">{{ label }}</label>
        <span v-if="showValue" class="nsl-value">{{ display }}</span>
    </div>
    <div class="nsl-track">
        <div class="nsl-rail" aria-hidden="true"></div>
        <div class="nsl-fill" :style="{ width: percent + '%' }" aria-hidden="true"></div>
        <input :id="uid" class="nsl-input" type="range"
            :min="min" :max="max" :step="step" :value="modelValue"
            :disabled="disabled" :aria-label="label || '滑块'" :aria-valuetext="display"
            @input="onInput" @change="onChange" />
    </div>
</div>
`
    };

    window.NuxSlider = NuxSlider;
})();
