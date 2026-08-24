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
            const bottomItems = Vue.computed(() => props.mobileMode === 'bottom-nav' ? props.menuItems.slice(0, props.bottomNavLimit) : []);
            const cssVars = Vue.computed(() => ({ '--nxs-w': effectiveWidth.value }));
            const controlled = Vue.computed(() => props.menuOpen !== undefined);
            const mobileMenuOpen = Vue.computed(() => controlled.value ? props.menuOpen : _menuOpen.value);
            const toggleMenu = () => { if (controlled.value) emit('update:menuOpen', !props.menuOpen); else _toggleMenu(); };
            const closeMenu = () => { if (controlled.value) emit('update:menuOpen', false); else _closeMenu(); };
            return { isMobile, mobileMenuOpen, toggleMenu, closeMenu, collapsed, toggleCollapsed, asideWidth, bottomItems, cssVars };
        },
        template: `
            <div :class="['nux-layout-sidebar', themeClass, { 'headerless': headerless, 'nx-bottom-nav-mode': mobileMode === 'bottom-nav' }]"
                 :style="cssVars">
                <header v-if="!headerless" class="nux-layout-header" :style="{ height: headerHeight }">
                    <button v-if="mobileMode === 'drawer'" class="nx-hamburger nx-show-mobile" @click="toggleMenu" :class="{'open': mobileMenuOpen}">
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
                            <a v-for="item in menuItems" :key="item.path"
                               :class="['nux-layout-nav-item', { active: currentPath === item.path }]"
                               :href="item.path" :title="collapsed ? item.label : ''"
                               @click.prevent="emit('navigate', item.path); closeMenu()">
                                <span v-if="item.icon" class="nux-layout-nav-icon" v-html="item.icon"></span>
                                <span v-if="item.label" class="nux-layout-nav-label">{{ item.label }}</span>
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
                    <a v-for="item in bottomItems" :key="item.path"
                       :class="['nux-layout-bottom-nav-item', { active: currentPath === item.path }]"
                       :href="item.path" @click.prevent="emit('navigate', item.path)">
                        <span v-if="item.icon" class="nux-layout-nav-icon" v-html="item.icon"></span>
                        <span v-if="item.label" class="nux-layout-nav-label">{{ item.label }}</span>
                    </a>
                </nav>
            </div>
        `
    };

    window.NuxLayoutSidebar = NuxLayoutSidebar;
})();
