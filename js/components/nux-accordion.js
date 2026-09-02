(function() {
    const NuxAccordion = {
        name: 'NuxAccordion',
        props: {
            items: { type: Array, default: () => [] },
            modelValue: { type: Number, default: -1 }
        },
        emits: ['update:modelValue', 'change'],
        methods: {
            toggle(i) {
                const next = this.modelValue === i ? -1 : i;
                this.$emit('update:modelValue', next);
                this.$emit('change', next);
            }
        },
        template: `
            <div class="nux-accordion">
                <div
                    v-for="(item, i) in items"
                    :key="i"
                    class="nux-acc-item"
                    :class="{ 'nux-acc-item--open': modelValue === i }"
                >
                    <button type="button" class="nux-acc-head" @click="toggle(i)" :aria-expanded="String(modelValue === i)">
                        <span class="nux-acc-title">{{ item.title }}</span>
                        <span class="nux-acc-arrow" aria-hidden="true">▾</span>
                    </button>
                    <div class="nux-acc-body">
                        <div class="nux-acc-content">
                            <slot :name="'item-' + i" :item="item">{{ item.content }}</slot>
                        </div>
                    </div>
                </div>
            </div>
        `
    };
    window.NuxAccordion = NuxAccordion;
})();
