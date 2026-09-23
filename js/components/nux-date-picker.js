(function () {
    const STYLE_ID = 'nux-date-picker-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.ndp{display:flex;flex-direction:column;gap:var(--nx-space-1,4px);width:100%}
.ndp-label{font-size:var(--nx-text-sm,14px);font-weight:500;color:var(--nx-text-heading,#0f172a)}
.ndp-control{position:relative;display:flex;align-items:center}
.ndp-input{width:100%;min-height:44px;padding:var(--nx-space-2,8px) var(--nx-space-3,12px);font-size:var(--nx-text-sm,14px);font-family:inherit;color:var(--nx-text-heading,#0f172a);background:var(--nx-bg-surface,#fff);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-md,10px);outline:none;box-sizing:border-box;transition:border-color var(--nx-transition-fast,.15s ease),box-shadow var(--nx-transition-fast,.15s ease)}
.ndp-input:hover:not(:disabled){border-color:var(--nx-border-hover,rgba(0,0,0,.15))}
.ndp-input:focus{border-color:var(--app-accent,#6366f1);box-shadow:0 0 0 3px rgba(var(--app-accent-rgb,99,102,241),.15)}
.ndp-input::placeholder{color:var(--nx-text-muted,#94a3b8)}
.ndp-input:disabled{cursor:not-allowed;color:var(--nx-text-muted,#94a3b8);background:var(--nx-bg-muted,#f1f5f9)}
.ndp-clear{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:none;border-radius:var(--nx-radius-full,9999px);background:transparent;color:var(--nx-text-muted,#94a3b8);font-size:16px;line-height:1;cursor:pointer;transition:background var(--nx-transition-fast,.15s ease),color var(--nx-transition-fast,.15s ease)}
.ndp-clear:hover{background:var(--nx-bg-hover,#f1f5f9);color:var(--nx-text-heading,#0f172a)}
.ndp-hint{font-size:var(--nx-text-xs,12px);color:var(--nx-text-muted,#94a3b8)}
@media(hover:none) and (pointer:coarse){.ndp-input{font-size:16px}}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    const NuxDatePicker = {
        name: 'NuxDatePicker',
        props: {
            modelValue: { type: String, default: '' },
            type: { type: String, default: 'date' },
            min: { type: String, default: '' },
            max: { type: String, default: '' },
            label: { type: String, default: '' },
            placeholder: { type: String, default: '' },
            disabled: { type: Boolean, default: false },
            clearable: { type: Boolean, default: true },
            hint: { type: String, default: '' }
        },
        emits: ['update:modelValue', 'change'],
        setup(props, ctx) {
            const instance = Vue.getCurrentInstance();
            const uid = 'ndp-' + (instance ? instance.uid : Math.random().toString(36).slice(2));

            const hasValue = Vue.computed(() => String(props.modelValue == null ? '' : props.modelValue).length > 0);

            function onInput(event) {
                ctx.emit('update:modelValue', event.target.value);
            }

            function onChange(event) {
                ctx.emit('change', event.target.value);
            }

            function clear() {
                if (props.disabled) return;
                ctx.emit('update:modelValue', '');
                ctx.emit('change', '');
            }

            return { uid, hasValue, onInput, onChange, clear };
        },
        template: `
<div class="ndp">
    <label v-if="label" class="ndp-label" :for="uid">{{ label }}</label>
    <div class="ndp-control">
        <input :id="uid" class="ndp-input" :type="type" :value="modelValue"
            :min="min || null" :max="max || null" :placeholder="placeholder" :disabled="disabled"
            @input="onInput" @change="onChange" />
        <button v-if="clearable && !disabled && hasValue" type="button" class="ndp-clear"
            aria-label="清除" @click="clear">×</button>
    </div>
    <span v-if="hint" class="ndp-hint">{{ hint }}</span>
</div>
`
    };

    window.NuxDatePicker = NuxDatePicker;
})();
