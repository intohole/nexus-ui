(function() {
    const NuxFooter = {
        name: 'nux-footer',
        props: {
            appName: { type: String, default: '' },
            showIcp: { type: Boolean, default: true },
            icpNumber: { type: String, default: '浙ICP备2024109932号' },
            company: { type: String, default: '杭州子晨科技有限公司' },
            email: { type: String, default: 'songguokr@126.com' }
        },
        template: `
            <footer class="nux-footer">
                <span v-if="appName" class="nux-footer-brand">{{ appName }}</span>
                <div class="nux-footer-row">
                    <span class="nux-footer-copy">© {{ company }}</span>
                    <span class="nux-footer-sep">·</span>
                    <a v-if="showIcp" class="nux-footer-link" href="https://beian.miit.gov.cn" target="_blank" rel="noopener">{{ icpNumber }}</a>
                    <span class="nux-footer-sep">·</span>
                    <a class="nux-footer-link" :href="'mailto:' + email">{{ email }}</a>
                </div>
            </footer>
        `
    };
    window.NuxFooter = NuxFooter;
    (function autoMount() {
        var tries = 0;
        function mount() {
            const el = document.querySelector('nux-footer-placeholder');
            if (!el) {
                return;
            }
            if (!window.Vue) {
                if (tries < 50) {
                    tries++;
                    setTimeout(mount, 200);
                }
                return;
            }
            if (el.getAttribute('data-mounted') === 'yes') {
                return;
            }
            const appName = el.getAttribute('app-name') || '';
            el.setAttribute('data-mounted', 'yes');
            const mounted = window.Vue.createApp({
                components: { NuxFooter },
                data() { return { appName: appName }; },
                template: '<nux-footer :app-name="appName"></nux-footer>'
            });
            mounted.mount(el);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount);
        } else {
            mount();
        }
    })();
})();