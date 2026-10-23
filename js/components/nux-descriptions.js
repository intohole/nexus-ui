(function() {
    const NuxDescriptions = {
        name: 'NuxDescriptions',
        props: {
            items: { type: Array, default: () => [] },
            columns: { type: Number, default: 2 },
            title: { type: String, default: '' }
        },
        computed: {
            styleVars() {
                return { '--nxd-cols': String(Math.max(1, Math.min(4, this.columns))) };
            }
        },
        template: `
            <div class="nx-descriptions" v-if="items.length" :style="styleVars">
                <div class="nx-descriptions-title" v-if="title">{{ title }}</div>
                <dl class="nx-descriptions-grid">
                    <div v-for="(item, i) in items" :key="i" class="nx-descriptions-item"
                         :style="item.span > 1 ? 'grid-column: span ' + Math.min(item.span, styleVars['--nxd-cols']) : ''">
                        <dt class="nx-descriptions-label">{{ item.label }}</dt>
                        <dd class="nx-descriptions-value">
                            <slot name="value" :item="item">{{ item.value === '' || item.value === null || item.value === undefined ? '—' : item.value }}</slot>
                        </dd>
                    </div>
                </dl>
            </div>
        `
    };

    window.NuxDescriptions = NuxDescriptions;
})();
