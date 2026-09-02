(function() {
    const NuxSwitch = {
        name: 'NuxSwitch',
        props: {
            modelValue: { type: Boolean, default: false },
            label: { type: String, default: '' },
            description: { type: String, default: '' },
            disabled: { type: Boolean, default: false }
        },
        emits: ['update:modelValue', 'change'],
        methods: {
            toggle() {
                if (this.disabled) return;
                this.$emit('update:modelValue', !this.modelValue);
                this.$emit('change', !this.modelValue);
            }
        },
        template: `
            <div class="nux-switch-field" :class="{ 'nux-switch-field--disabled': disabled }" @click="toggle" role="switch" :aria-checked="String(modelValue)">
                <div v-if="label || description" class="nux-switch-text">
                    <span v-if="label" class="nux-switch-label">{{ label }}</span>
                    <span v-if="description" class="nux-switch-desc">{{ description }}</span>
                </div>
                <span class="nux-switch-track" :class="{ 'nux-switch-track--on': modelValue }">
                    <span class="nux-switch-thumb"></span>
                </span>
            </div>
        `
    };
    window.NuxSwitch = NuxSwitch;
})();
