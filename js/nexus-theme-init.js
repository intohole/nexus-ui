(function() {
    var KEY = 'nx-theme';
    var VALID = { dark: 1, light: 1 };
    try {
        var legacy = window.NEXUS_THEME_LEGACY_KEYS;
        if (legacy && legacy.length) {
            for (var i = 0; i < legacy.length; i++) {
                var v = localStorage.getItem(legacy[i]);
                if (v === null) continue;
                if (localStorage.getItem(KEY) === null && VALID[v]) localStorage.setItem(KEY, v);
                localStorage.removeItem(legacy[i]);
            }
        }
    } catch (e) { /* 隐私模式等场景静默降级 */ }
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* 同上 */ }
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
