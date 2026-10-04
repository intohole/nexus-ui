(function() {
    const NuxTabGroup = {
        name: 'NuxTabGroup',
        props: {
            modelValue: { type: [String, Number], default: '' },
            tabs: { type: Array, default: () => [] },
            ariaLabel: { type: String, default: '' }
        },
        emits: ['update:modelValue'],
        computed: {
            activeKey() {
                const hit = this.tabs.find(t => t.key === this.modelValue);
                if (hit) return hit.key;
                return this.tabs.length ? this.tabs[0].key : '';
            }
        },
        setup(props, { emit }) {
            const select = (key) => emit('update:modelValue', key);
            const onKeydown = (e) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || !props.tabs.length) return;
                const current = props.tabs.findIndex(t => t.key === props.modelValue);
                const next = NexusUtils.rovingIndex(e, props.tabs.length, current);
                e.preventDefault();
                const tab = props.tabs[next];
                if (!tab) return;
                select(tab.key);
                Vue.nextTick(() => {
                    const el = e.currentTarget && e.currentTarget.querySelector('[data-tab-key="' + tab.key + '"]');
                    if (el && el.focus) el.focus();
                });
            };
            return { select, onKeydown };
        },
        template: `
            <div class="nux-tab-group" role="tablist" :aria-label="ariaLabel || undefined" @keydown="onKeydown">
                <button v-for="tab in tabs" :key="tab.key" type="button"
                        role="tab"
                        :data-tab-key="tab.key"
                        :class="['nux-tab-item', { active: modelValue === tab.key }]"
                        :aria-selected="modelValue === tab.key ? 'true' : 'false'"
                        :tabindex="tab.key === activeKey ? 0 : -1"
                        @click="select(tab.key)">
                    <span v-if="tab.icon" class="nux-tab-icon" aria-hidden="true">{{ tab.icon }}</span>
                    {{ tab.label }}
                </button>
            </div>
        `
    };

    window.NuxTabGroup = NuxTabGroup;
})();
