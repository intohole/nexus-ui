(function() {
    if (typeof Vue === 'undefined') {
        console.error('[nexus-ui] 依赖 Vue 未加载：请先引入 vue.global.prod.js 再加载 use-mobile.js。');
        return;
    }
    const { ref, onMounted, onUnmounted } = Vue;

    const useMobile = (breakpoint = 768) => {
        const isMobile = ref(window.innerWidth <= breakpoint);
        const mobileMenuOpen = ref(false);
        let mql = null;

        const onChange = (e) => {
            isMobile.value = e.matches;
            if (!e.matches) mobileMenuOpen.value = false;
        };

        const toggleMenu = () => { mobileMenuOpen.value = !mobileMenuOpen.value; };
        const closeMenu = () => { mobileMenuOpen.value = false; };

        onMounted(() => {
            mql = window.matchMedia('(max-width: ' + breakpoint + 'px)');
            isMobile.value = mql.matches;
            if (mql.addEventListener) mql.addEventListener('change', onChange);
            else if (mql.addListener) mql.addListener(onChange);
        });
        onUnmounted(() => {
            if (!mql) return;
            if (mql.removeEventListener) mql.removeEventListener('change', onChange);
            else if (mql.removeListener) mql.removeListener(onChange);
            mql = null;
        });

        return { isMobile, mobileMenuOpen, toggleMenu, closeMenu };
    };

    window.useMobile = useMobile;
})();
