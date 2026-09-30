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

        // 仅用户主动切换才持久化；跟随系统的初始应用不落盘，系统偏好变化才能持续生效
        const toggleTheme = () => {
            applyTheme(!isDark.value);
            try { localStorage.setItem(storageKey, isDark.value ? 'dark' : 'light'); } catch (e) { /* 隐私模式静默 */ }
        };

        onMounted(() => {
            let saved = null;
            try { saved = localStorage.getItem(storageKey); } catch (e) { /* 同上 */ }
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

        return { isDark, toggleTheme, applyTheme };
    };

    window.useTheme = useTheme;
})();
