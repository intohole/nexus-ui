(function() {
    const NuxBottomNav = {
        name: 'NuxBottomNav',
        props: {
            items: { type: Array, default: () => [] },
            currentKey: { type: String, default: '' },
            themeClass: { type: String, default: '' },
            bottomNavLimit: { type: Number, default: 5 }
        },
        emits: ['navigate'],
        setup(props, { emit }) {
            const shownItems = Vue.computed(() => props.items.slice(0, props.bottomNavLimit));
            return { shownItems, emit };
        },
        template: `
            <nav :class="['nux-bottom-nav', themeClass]">
                <button v-for="item in shownItems" :key="item.key"
                        :class="['nux-bottom-nav-item', { active: currentKey === item.key }]"
                        type="button"
                        :aria-current="currentKey === item.key ? 'page' : undefined"
                        @click="emit('navigate', item.key)">
                    <span v-if="item.icon" class="nux-bottom-nav-icon" v-html="item.icon"></span>
                    <span v-if="item.label" class="nux-bottom-nav-label">{{ item.label }}</span>
                    <span v-if="item.badge" class="nux-bottom-nav-badge">{{ item.badge }}</span>
                </button>
            </nav>
        `
    };

    window.NuxBottomNav = NuxBottomNav;
})();
