(function() {
    const NuxBottomNav = {
        name: 'NuxBottomNav',
        props: {
            items: { type: Array, default: () => [] },
            currentKey: { type: String, default: '' },
            themeClass: { type: String, default: '' },
            bottomNavLimit: { type: Number, default: 5 },
            moreActive: { type: Boolean, default: false }
        },
        emits: ['navigate', 'more'],
        setup(props, { emit }) {
            const shownItems = Vue.computed(() => props.items.slice(0, props.bottomNavLimit));
            const hasMore = Vue.computed(() => props.items.length > props.bottomNavLimit || props.moreActive);
            return { shownItems, hasMore, emit };
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
                <button v-if="hasMore" class="nux-bottom-nav-item" :class="{ active: moreActive }"
                        type="button" aria-label="更多"
                        @click="emit('more')">
                    <span class="nux-bottom-nav-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                    </span>
                    <span class="nux-bottom-nav-label">更多</span>
                </button>
            </nav>
        `
    };

    window.NuxBottomNav = NuxBottomNav;
})();
