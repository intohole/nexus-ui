(function() {
    var saved = null;
    try { saved = localStorage.getItem('nx-theme'); } catch (e) { /* 隐私模式等场景静默降级 */ }
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
