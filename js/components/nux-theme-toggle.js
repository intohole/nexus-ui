(function() {
    const STYLE = `
        .nux-theme-toggle{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid var(--nx-border,#e5e7eb);background:transparent;color:var(--nx-text-secondary,#4b5563);cursor:pointer;transition:background-color .2s ease,color .2s ease,border-color .2s ease;flex:none}
        .nux-theme-toggle:hover{background:var(--nx-hover,#f3f4f6);color:var(--nx-text,#111827)}
        .nux-theme-toggle:focus-visible{outline:2px solid var(--nx-primary,#2563eb);outline-offset:2px}
        .nux-theme-toggle:active{transform:scale(.96)}
        @media (prefers-reduced-motion: reduce){.nux-theme-toggle{transition:none}.nux-theme-toggle:active{transform:none}}
        @media (max-width:768px){.nux-theme-toggle{width:44px;height:44px}}
    `;

    const ICONS = {
        moon: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 11.5A7.5 7.5 0 0 1 8.5 3a7.5 7.5 0 1 0 8.5 8.5Z"/></svg>',
        sun: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4"/></svg>'
    };

    const NuxThemeToggle = {
        name: 'NuxThemeToggle',
        emits: ['change'],
        setup(props, { emit }) {
            const { ref, computed, onMounted } = Vue;
            const { isDark, toggleTheme } = window.useTheme();
            const ready = ref(false);
            onMounted(() => { ready.value = true; });
            const dark = computed(() => ready.value && isDark.value);
            const label = computed(() => dark.value ? '切换到浅色模式' : '切换到深色模式');
            const icon = computed(() => dark.value ? ICONS.moon : ICONS.sun);
            const toggle = () => {
                toggleTheme();
                emit('change', isDark.value);
            };
            return { dark, label, icon, toggle };
        },
        template: `
            <button type="button" class="nux-theme-toggle" :aria-label="label" :title="label" @click="toggle" v-html="icon"></button>
        `,
        mounted() {
            window.NexusUtils && NexusUtils.injectStyle('nux-theme-toggle-css', STYLE);
        }
    };
    window.NuxThemeToggle = NuxThemeToggle;
})();
