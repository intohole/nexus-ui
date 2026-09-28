(function() {
    const { ref, watch, onMounted, onBeforeUnmount } = Vue;

    const useTheme = (options = {}) => {
        const storageKey = options.storageKey || 'nx-theme';
        const followSystem = options.followSystem !== false;
        const isDark = ref(false);
        let media = null;
        let onSystemChange = null;

        const applyTheme = (dark) => {
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            document.documentElement.classList.toggle('light-mode', !dark);
            isDark.value = dark;
        };

        const toggleTheme = () => applyTheme(!isDark.value);

        onMounted(() => {
            const saved = localStorage.getItem(storageKey);
            if (saved === 'dark' || saved === 'light') {
                applyTheme(saved === 'dark');
            } else if (followSystem && window.matchMedia) {
                media = window.matchMedia('(prefers-color-scheme: dark)');
                applyTheme(media.matches);
                onSystemChange = (e) => applyTheme(e.matches);
                media.addEventListener ? media.addEventListener('change', onSystemChange)
                                      : media.addListener(onSystemChange);
            } else {
                applyTheme(false);
            }
        });

        onBeforeUnmount(() => {
            if (media && onSystemChange) {
                media.removeEventListener ? media.removeEventListener('change', onSystemChange)
                                          : media.removeListener(onSystemChange);
            }
        });

        watch(isDark, (val) => localStorage.setItem(storageKey, val ? 'dark' : 'light'));

        return { isDark, toggleTheme, applyTheme };
    };

    window.useTheme = useTheme;
})();
