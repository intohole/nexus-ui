(function() {
    const { ref, onMounted, onUnmounted } = Vue;

    const useMobile = (breakpoint = 768) => {
        const isMobile = ref(window.innerWidth < breakpoint);
        const mobileMenuOpen = ref(false);

        const checkMobile = () => {
            isMobile.value = window.innerWidth < breakpoint;
            if (!isMobile.value) mobileMenuOpen.value = false;
        };

        const toggleMenu = () => { mobileMenuOpen.value = !mobileMenuOpen.value; };
        const closeMenu = () => { mobileMenuOpen.value = false; };

        onMounted(() => window.addEventListener('resize', NexusUtils.debounce(checkMobile, 150)));
        onUnmounted(() => window.removeEventListener('resize', checkMobile));

        return { isMobile, mobileMenuOpen, toggleMenu, closeMenu };
    };

    window.useMobile = useMobile;
})();
