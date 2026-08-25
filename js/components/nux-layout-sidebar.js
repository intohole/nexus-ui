(function() {
    const NuxLayoutSidebar = {
        name: 'NuxLayoutSidebar',
        props: {
            sidebarWidth: { type: String, default: '240px' },
            collapsedWidth: { type: String, default: '68px' },
            headerHeight: { type: String, default: '56px' },
            appName: { type: String, default: '' },
            appIcon: { type: String, default: '' },
            themeClass: { type: String, default: '' },
            menuItems: { type: Array, default: () => [] },
            menuGroups: { type: Array, default: () => [] },
            currentPath: { type: String, default: '' },
            collapsible: { type: Boolean, default: false },
            mobileMode: { type: String, default: 'drawer' },
            bottomNavLimit: { type: Number, default: 4 },
            headerless: { type: Boolean, default: false },
            menuOpen: { type: Boolean, default: undefined }
        },
        emits: ['navigate', 'toggle-collapsed', 'update:menuOpen'],
        setup(props, { emit }) {
            const { isMobile, mobileMenuOpen: _menuOpen, toggleMenu: _toggleMenu, closeMenu: _closeMenu } = useMobile();
            const collapsed = Vue.ref(false);
            const toggleCollapsed = () => {
                collapsed.value = !collapsed.value;
                emit('toggle-collapsed', collapsed.value);
            };
            const effectiveWidth = Vue.computed(() => collapsed.value ? props.collapsedWidth : props.sidebarWidth);
            const asideWidth = Vue.computed(() => isMobile.value ? props.sidebarWidth : effectiveWidth.value);
            const hasGroups = Vue.computed(() => props.menuGroups && props.menuGroups.length > 0);
            const isActive = (item) => props.currentPath === (item.path ?? item.key);
            const badgeOf = (item) => typeof item.badge === 'function' ? item.badge() : item.badge;
            const itemKey = (item) => item.path ?? item.key;
            const flattenItems = () => hasGroups.value ? props.menuGroups.flatMap(g => g.items || []) : props.menuItems;
            const bottomItems = Vue.computed(() => props.mobileMode === 'bottom-nav' ? flattenItems().slice(0, props.bottomNavLimit) : []);
            const cssVars = Vue.computed(() => ({ '--nxs-w': effectiveWidth.value }));
            const controlled = Vue.computed(() => props.menuOpen !== undefined);
            const mobileMenuOpen = Vue.computed(() => controlled.value ? props.menuOpen : _menuOpen.value);
            const toggleMenu = () => { if (controlled.value) emit('update:menuOpen', !props.menuOpen); else _toggleMenu(); };
            const closeMenu = () => { if (controlled.value) emit('update:menuOpen', false); else _closeMenu(); };
            Vue.watch(isMobile, (mobile) => {
                if (!mobile && controlled.value && props.menuOpen) emit('update:menuOpen', false);
            });
            return { isMobile, mobileMenuOpen, toggleMenu, closeMenu, collapsed, toggleCollapsed, asideWidth, hasGroups, isActive, badgeOf, itemKey, bottomItems, cssVars };
        },
        template: `
            <div :class="['nux-layout-sidebar', themeClass, { 'headerless': headerless, 'nx-bottom-nav-mode': mobileMode === 'bottom-nav' }]"
                 :style="cssVars">
                <header v-if="!headerless" class="nux-layout-header" :style="{ height: headerHeight }">
                    <button v-if="mobileMode === 'drawer'" class="nx-hamburger nx-show-mobile" @click="toggleMenu" :class="{'open': mobileMenuOpen}" aria-label="菜单" :aria-expanded="mobileMenuOpen ? 'true' : 'false'">
                        <span class="nx-hamburger-inner">
                            <span class="nx-hamburger-line"></span>
                            <span class="nx-hamburger-line"></span>
                            <span class="nx-hamburger-line"></span>
                        </span>
                    </button>
                    <div class="nux-layout-brand" v-if="appIcon || appName">
                        <span v-if="appIcon" class="nux-layout-brand-icon" v-html="appIcon"></span>
                        <span v-if="appName" class="nux-layout-brand-name">{{ appName }}</span>
                    </div>
                    <div class="nux-layout-header-actions">
                        <slot name="header-actions"></slot>
                    </div>
                </header>
                <div class="nx-drawer-overlay" :class="{'open': mobileMenuOpen && isMobile}" @click="closeMenu"></div>
                <aside :class="['nux-layout-aside', {'collapsed': collapsed, 'mobile-open': mobileMenuOpen && isMobile}]"
                       :style="{ width: asideWidth, top: headerless ? 0 : headerHeight }">
                    <nav class="nux-layout-nav">
                        <slot name="sidebar">
                            <template v-if="hasGroups">
                                <div v-for="group in menuGroups" :key="group.title || group.label" class="nux-layout-nav-group">
                                    <div v-if="group.title || group.label" class="nux-layout-nav-group-title">{{ group.title || group.label }}</div>
                                    <a v-for="item in group.items || []" :key="itemKey(item)"
                                       :class="['nux-layout-nav-item', { active: isActive(item) }]"
                                       :href="item.path || '#'" :title="collapsed ? item.label : ''"
                                       :aria-current="isActive(item) ? 'page' : undefined"
                                       @click.prevent="emit('navigate', itemKey(item)); closeMenu()">
                                        <span v-if="item.icon" class="nux-layout-nav-icon" v-html="item.icon"></span>
                                        <span v-if="item.label" class="nux-layout-nav-label">{{ item.label }}</span>
                                        <span v-if="badgeOf(item)" class="nux-layout-nav-badge">{{ badgeOf(item) }}</span>
                                    </a>
                                </div>
                            </template>
                            <a v-else v-for="item in menuItems" :key="itemKey(item)"
                               :class="['nux-layout-nav-item', { active: isActive(item) }]"
                               :href="item.path || '#'" :title="collapsed ? item.label : ''"
                               :aria-current="isActive(item) ? 'page' : undefined"
                               @click.prevent="emit('navigate', itemKey(item)); closeMenu()">
                                <span v-if="item.icon" class="nux-layout-nav-icon" v-html="item.icon"></span>
                                <span v-if="item.label" class="nux-layout-nav-label">{{ item.label }}</span>
                                <span v-if="badgeOf(item)" class="nux-layout-nav-badge">{{ badgeOf(item) }}</span>
                            </a>
                        </slot>
                    </nav>
                    <div class="nux-layout-aside-footer">
                        <button v-if="collapsible && !isMobile" class="nux-layout-collapse-btn" @click="toggleCollapsed" :title="collapsed ? '展开' : '收起'">
                            <svg v-if="collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <slot name="sidebar-footer"></slot>
                    </div>
                </aside>
                <main class="nux-layout-main">
                    <slot></slot>
                </main>
                <nav v-if="mobileMode === 'bottom-nav' && isMobile" class="nux-layout-bottom-nav">
                    <a v-for="item in bottomItems" :key="itemKey(item)"
                       :class="['nux-layout-bottom-nav-item', { active: isActive(item) }]"
                       :href="item.path || '#'" @click.prevent="emit('navigate', itemKey(item))">
                        <span v-if="item.icon" class="nux-layout-nav-icon" v-html="item.icon"></span>
                        <span v-if="item.label" class="nux-layout-nav-label">{{ item.label }}</span>
                    </a>
                </nav>
            </div>
        `
    };

    window.NuxLayoutSidebar = NuxLayoutSidebar;
})();
