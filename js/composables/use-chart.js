(function() {
    const THEME_ATTR = 'data-theme';
    const charts = new Set();
    let themeObserver = null;

    const currentIsDark = () => document.documentElement.getAttribute(THEME_ATTR) === 'dark';

    const ensureThemeObserver = () => {
        if (themeObserver || typeof MutationObserver === 'undefined') return;
        themeObserver = new MutationObserver(() => {
            charts.forEach(c => c._rerender());
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: [THEME_ATTR] });
        window.addEventListener('resize', () => charts.forEach(c => c.resize()));
    };

    const useChart = () => {
        let el = null;
        let instance = null;
        let lastOption = null;
        let disposed = false;

        const chart = {
            get instance() { return instance; },
            render(option, notMerge) {
                lastOption = option;
                if (typeof echarts === 'undefined') return null;
                if (!instance) {
                    if (!el) return null;
                    instance = echarts.init(el, currentIsDark() ? 'dark' : null);
                    charts.add(chart);
                    ensureThemeObserver();
                }
                instance.setOption(option, notMerge !== false);
                return instance;
            },
            resize() { if (instance && !disposed) instance.resize(); },
            dispose() {
                if (instance) { instance.dispose(); charts.delete(chart); }
                instance = null;
                el = null;
                disposed = true;
            },
            _rerender() {
                if (!lastOption || disposed || !el) return;
                if (instance) { instance.dispose(); instance = null; }
                if (typeof echarts === 'undefined') return;
                instance = echarts.init(el, currentIsDark() ? 'dark' : null);
                instance.setOption(lastOption);
            },
            bind(elementRef) {
                Vue.watchEffect(() => {
                    const node = elementRef && elementRef.value ? elementRef.value : elementRef;
                    if (node && !disposed) el = node;
                });
                if (Vue.getCurrentInstance()) {
                    Vue.onUnmounted(() => chart.dispose());
                }
                return chart;
            },
        };
        return chart;
    };

    window.useChart = useChart;
})();
