(function() {
    const NuxBreadcrumb = {
        name: 'NuxBreadcrumb',
        props: {
            items: { type: Array, default: () => [] },
            ariaLabel: { type: String, default: '面包屑' }
        },
        template: `
            <nav class="nux-breadcrumb" :aria-label="ariaLabel">
                <template v-for="(item, i) in items" :key="i">
                    <span v-if="i > 0" class="nux-breadcrumb-sep" aria-hidden="true">/</span>
                    <a v-if="item.path && i < items.length - 1" :href="item.path" class="nux-breadcrumb-link">{{ item.label }}</a>
                    <span v-else :class="['nux-breadcrumb-text', { active: i === items.length - 1 }]" :aria-current="i === items.length - 1 ? 'page' : undefined">{{ item.label }}</span>
                </template>
            </nav>
        `
    };

    window.NuxBreadcrumb = NuxBreadcrumb;
})();
